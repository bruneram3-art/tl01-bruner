import pdfplumber
import sys
import json

path = r"c:\Users\40000398\OneDrive - ArcelorMittal\Desktop\n8n\plano de cambio\chato 2.pdf"

try:
    with pdfplumber.open(path) as pdf:
        text = ""
        for page in pdf.pages:
            text += page.extract_text(layout=True)
            text += "\n" + "-"*50 + "\n"
        
        print(text)
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
