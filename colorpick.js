function updatePreview() {
    const hue = document.getElementById("Hue").value;
    const sat = document.getElementById("Saturation").value;
    const light = document.getElementById("Lightness").value;
    
    document.querySelector(".color-preview span").style.backgroundColor = `hsl(${hue}, ${sat}%, ${light}%)`;
}

document.getElementById("Hue").addEventListener("input", function() {
    const hueValue=this.value
    document.getElementById("Saturation").style.setProperty("--hue", hueValue);
    document.getElementById("Lightness").style.setProperty("--hue", hueValue);
    document.getElementById("Hue").addEventListener("input", updatePreview);
document.getElementById("Saturation").addEventListener("input", updatePreview);
document.getElementById("Lightness").addEventListener("input", updatePreview);
});
