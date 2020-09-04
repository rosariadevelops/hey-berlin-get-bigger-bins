const canvas = document.getElementById('canvas');
const hiddenInput = document.getElementById('hidden');
const ctx = canvas.getContext('2d');
//let dataURL = canvas.toDataURL();
//var dataURL = canvas.toDataURL("image/png");
canvas.width = 600;
canvas.height = 200;

ctx.lineJoin = 'round';
ctx.lineCap = 'round';
ctx.lineWidth = 4;
ctx.strokeStyle = '#000000';

let isDrawing = false;
let locX = 0;
let locY = 0;

function drawSig(sig) {
    if (!isDrawing) return; // this stops the drawing if they aren't mousedown
    ctx.beginPath();
    ctx.moveTo(locX, locY);
    ctx.lineTo(sig.offsetX, sig.offsetY);
    ctx.stroke();
    [locX, locY] = [sig.offsetX, sig.offsetY];
}

canvas.addEventListener('mousedown', (event) => {
    isDrawing = true;
    [locX, locY] = [event.offsetX, event.offsetY];
});
canvas.addEventListener('mousemove', drawSig);
canvas.addEventListener('mouseup', () => (isDrawing = false));
canvas.addEventListener('mouseout', () => (isDrawing = false));

let dataURL = canvas.toDataURL('image/png', 1.0);

hiddenInput.value = dataURL;
console.log('dataURL: ', dataURL);
console.log('hidden input: ', hiddenInput);
