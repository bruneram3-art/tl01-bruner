
function testScaling(barWidth, barHeight, svgSize = 280) {
    const maxDim = Math.max(barWidth, barHeight, 1);
    const scale = (svgSize * 0.8) / maxDim;

    console.log(`Bar: ${barWidth}x${barHeight} | Scale: ${scale.toFixed(4)}`);

    const scaledW = barWidth * scale;
    const scaledH = barHeight * scale;

    // Simulations from hrsGeometry.ts
    const collars = {
        flat: 150,
        box: 40,
        oval: 30,
        round: 25
    };

    for (const [type, collar] of Object.entries(collars)) {
        const totalWidth = scaledW + (collar * 2);
        const overflow = totalWidth > svgSize;
        console.log(`  ${type.padEnd(6)}: ScaledW=${scaledW.toFixed(1)}, Collar=${collar}, Total=${totalWidth.toFixed(1)} ${overflow ? '!!OVERFLOW!!' : ''}`);
    }
}

console.log("--- TESTE DE ESCALONAMENTO ---");
testScaling(130, 130); // Roughing initial
testScaling(80, 60);   // Intermediate
testScaling(10, 10);   // Finishing
