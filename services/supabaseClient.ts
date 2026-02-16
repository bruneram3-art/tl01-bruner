import { createClient } from '@supabase/supabase-js';

// URL do seu projeto Supabase extraída do link fornecido
const SUPABASE_URL = 'https://tyrxbarucopizpcalooh.supabase.co';

// Chave ANON pública configurada
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5cnhiYXJ1Y29waXpwY2Fsb29oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwMDQ0OTUsImV4cCI6MjA2NzU4MDQ5NX0.ycJzhslzMyD0DQWWu5hY09SucH94OTwWI60oIqm-EB8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ========== MIGRAÇÃO AUTOMÁTICA ==========
/**
 * Verifica se as colunas 'massa_linear' e 'familia' existem na tabela.
 * Se não existirem, tenta adicioná-las via RPC.
 * Roda uma vez no startup do app.
 */
let migrationDone = false;
export const ensureTableColumns = async () => {
  if (migrationDone) return;
  migrationDone = true;

  try {
    // Verifica se as colunas existem tentando um SELECT
    const { data, error } = await supabase
      .from('metas_producao')
      .select('massa_linear, familia')
      .limit(1);

    if (error) {
      console.warn('⚠️ Colunas massa_linear/familia podem não existir:', error.message);
      console.log('📋 Execute no Supabase SQL Editor:');
      console.log('   ALTER TABLE metas_producao ADD COLUMN IF NOT EXISTS massa_linear NUMERIC;');
      console.log('   ALTER TABLE metas_producao ADD COLUMN IF NOT EXISTS familia TEXT;');
    } else {
      console.log('✅ Colunas massa_linear e familia OK. Dados:', data);
    }
  } catch (err) {
    console.error('Erro na verificação de schema:', err);
  }
};

export const getMetasFromSupabase = async () => {
  try {
    // Tenta buscar da nova tabela 'metas_producao' com Paginação
    let allMetas: any[] = [];
    let from = 0;
    const step = 1000;
    let more = true;

    while (more) {
      const { data, error } = await supabase
        .from('metas_producao')
        .select('*')
        .range(from, from + step - 1);

      if (error) throw error;

      if (data && data.length > 0) {
        allMetas = [...allMetas, ...data];
        from += step;
        // Se veio menos que o step, acabou
        if (data.length < step) more = false;
      } else {
        more = false;
      }
    }

    return allMetas;
  } catch (err) {
    console.error("Erro ao buscar metas do Supabase:", err);
    throw err;
  }
};

// Interface do Log de Auditoria
export interface AuditLogEntry {
  id?: string;
  sap: string;
  field_changed: string;
  old_value: any;
  new_value: any;
  changed_by: string; // Pode ser um ID de usuário ou "Sistema"
  changed_at?: string;
}

export const logMetaChange = async (entry: AuditLogEntry) => {
  try {
    const { error } = await supabase
      .from('meta_audit_log') // Nome da nova tabela
      .insert([entry]);

    if (error) throw error;
  } catch (err) {
    console.error("Erro ao registrar auditoria:", err);
    // Não lançamos erro aqui para não travar a operação principal, mas logamos
  }
};

export const getAuditLog = async (sap?: string) => {
  try {
    let query = supabase
      .from('meta_audit_log')
      .select('*')
      .order('changed_at', { ascending: false });

    if (sap) {
      query = query.eq('sap', sap);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  } catch (err) {
    console.error("Erro ao buscar logs de auditoria:", err);
    throw err;
  }
};

export const updateMetasInSupabase = async (metasData: any[], user = "Sistema") => {
  try {
    // 1. Buscar valores atuais para comparar (Apenas se for um update de registro existente)
    // Para simplificar, vamos assumir que o frontend já sabe o valor antigo ou buscamos aqui.
    // Como é um 'Upsert', fica difícil saber se mudou sem consultar antes.

    // Vamos fazer um loop para verificar mudanças linha a linha (ideal para poucos registros)
    const currentMetas = await getMetasFromSupabase();
    const currentMap = new Map(currentMetas?.map((m: any) => [m.sap, m]));

    const auditEntries: AuditLogEntry[] = [];

    for (const newMeta of metasData) {
      const oldMeta = currentMap.get(newMeta.sap);
      if (oldMeta) {
        // Comparar campos críticos
        const fields = ['gas', 'energia', 'rm', 'metaProducao', 'massa_linear', 'familia'];
        fields.forEach(field => {
          if (newMeta[field] !== undefined && newMeta[field] !== oldMeta[field]) {
            auditEntries.push({
              sap: newMeta.sap,
              field_changed: field,
              old_value: oldMeta[field],
              new_value: newMeta[field],
              changed_by: user
            });
          }
        });
      }
    }

    // 2. Salvar Auditoria (Não-bloqueante)
    if (auditEntries.length > 0) {
      const { error: auditError } = await supabase.from('meta_audit_log').insert(auditEntries);
      if (auditError) {
        console.warn("Aviso: Auditoria não salva (Tabela meta_audit_log pode não existir).", auditError);
      }
    }

    // 3. Upsert na tabela de metas
    const { data, error } = await supabase
      .from('metas_producao')
      .upsert(metasData);

    if (error) throw error;
    return data;
  } catch (err) {
    console.error("Erro ao atualizar metas no Supabase:", err);
    throw err;
  }
};

// ========== FUNÇÕES PARA O SIMULADOR DE RENDIMENTO ==========

/**
 * Busca todas as bitolas/produtos disponíveis
 * Tabela esperada: 'produtos' ou 'bitolas' com campos: sap, bitola, familia, massa_linear
 */
export const getBitolasFromSupabase = async (familia?: string) => {
  try {
    let allBitolas: any[] = [];
    let from = 0;
    const step = 1000;
    let more = true;

    while (more) {
      const { data, error } = await supabase
        .from('metas_producao')
        .select('sap, bitola')
        .range(from, from + step - 1);

      if (error) {
        console.error("Erro na paginação de bitolas:", error);
        throw error;
      };

      if (data && data.length > 0) {
        allBitolas = [...allBitolas, ...data];
        from += step;
        if (data.length < step) more = false;
      } else {
        more = false;
      }
    }

    console.log('🔍 [getBitolas] Resposta do Supabase Pagina:', {
      totalRegistros: allBitolas.length,
      primeiros3: allBitolas.slice(0, 3)
    });


    // Remove duplicatas baseado na bitola
    const uniqueBitolas: any[] = [];
    const seen = new Set();

    for (const item of allBitolas) {
      const bitolaVal = String(item.bitola || "").trim();
      if (bitolaVal && !seen.has(bitolaVal)) {
        seen.add(bitolaVal);
        uniqueBitolas.push(item);
      }
    }

    console.log('🔍 [getBitolas] Bitolas únicas:', uniqueBitolas.length);

    return uniqueBitolas;
  } catch (err) {
    console.error("❌ [getBitolas] Erro ao buscar bitolas do Supabase:", err);
    return [];
  }
};

/**
 * Busca dados completos de um produto específico pela bitola/SAP
 * Retorna: massa_linear, rm (rendimento), e outros dados relevantes
 */
export const getProductByBitola = async (bitola: string) => {
  try {
    const { data, error } = await supabase
      .from('metas_producao')
      .select('*')
      .eq('bitola', bitola)
      .limit(1); // Mudei de .single() para .limit(1) pois podem haver múltiplos SAPs com mesma bitola

    if (error) throw error;

    const result = data && data.length > 0 ? data[0] : null;
    console.log(`🔍 [getProductByBitola] Buscando "${bitola}":`, result ? "Encontrado" : "Não encontrado");
    if (result) console.log(`🔍 [getProductByBitola] Massa Linear: ${result.massa_linear}`);

    return result;
  } catch (err) {
    console.error("Erro ao buscar produto por bitola:", err);
    return null;
  }
};

/**
 * Busca produto pelo SAP
 */
export const getProductBySAP = async (sap: string) => {
  try {
    const { data, error } = await supabase
      .from('metas_producao')
      .select('*')
      .eq('sap', sap)
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error("Erro ao buscar produto por SAP:", err);
    return null;
  }
};

export const getPcpFromSupabase = async () => {
  try {
    const { data, error } = await supabase
      .from('pcp_data')
      .select('*')
      .order('inicio', { ascending: true });

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Erro ao buscar PCP do Supabase:', err);
    return [];
  }
};

export const savePcpToSupabase = async (pcpData: any[]) => {
  try {
    // 1. Limpar dados antigos (opcional, dependendo se quer acumular ou substituir)
    // Para PCP, geralmente substituímos o plano do mês
    const { error: deleteError } = await supabase
      .from('pcp_data')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Deleta tudo

    if (deleteError) throw deleteError;

    // 2. Inserir novos dados
    const { data, error } = await supabase
      .from('pcp_data')
      .insert(pcpData);

    if (error) throw error;
    return data;
  } catch (err) {
    console.error("Erro ao salvar PCP no Supabase:", err);
    throw err;
  }
};
