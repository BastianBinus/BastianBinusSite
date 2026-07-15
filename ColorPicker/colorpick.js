function updatePreview() {
    const hue = document.getElementById("Hue").value;
    const sat = document.getElementById("Saturation").value;
    const light = document.getElementById("Lightness").value;
    document.querySelector(".color-preview span").style.backgroundColor = `hsl(${hue}, ${sat}%, ${light}%)`;
    let rgbVal = hslToRgb(hue/360, sat/100, light/100)
    let rVal = rgbVal[0]
    let gVal = rgbVal[1]
    let bVal = rgbVal[2]
    let HexOut = rgbToHex(rVal, gVal, bVal)
    let rgbOut = rgbOutputFunction(rVal, gVal, bVal)
    document.getElementById("hexOutput").value = HexOut;
    document.getElementById("rgbOutput").value = rgbOut;
    document.getElementById("hue-val").textContent = `${hue}°`
    document.getElementById("sat-val").textContent = `${sat}%`
    document.getElementById("light-val").textContent = `${light}%`

}

function copyValue(elementId) {
    const value = document.getElementById(elementId).value;
    navigator.clipboard.writeText(value)
    const btn = event.currentTarget;
    const original = btn.innerHTML;
    btn.innerHTML = "✓";
    setTimeout(() => btn.innerHTML = original, 1000);
}




document.getElementById("Hue").addEventListener("input", function() {
    const hueValue = this.value;
    document.getElementById("Saturation").style.setProperty("--hue", hueValue);
    document.getElementById("Lightness").style.setProperty("--hue", hueValue);
});

document.getElementById("Hue").addEventListener("input", updatePreview);
document.getElementById("Saturation").addEventListener("input", updatePreview);
document.getElementById("Lightness").addEventListener("input", updatePreview);
document.getElementById("Hue").dispatchEvent(new Event("input"));
