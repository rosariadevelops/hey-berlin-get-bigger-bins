(function () {
    const canvas = $('#canvas');
    const ctx = canvas[0].getContext('2d');
    const hiddenInput = $('#hidden');
    canvas.width = 600;
    canvas.height = 200;

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ff3f00';

    let isDrawing = false;
    let x = 0;
    let y = 0;

    function drawSig(sig) {
        if (!isDrawing) return;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(sig.offsetX, sig.offsetY);
        ctx.stroke();
        [x, y] = [sig.offsetX, sig.offsetY];
    }

    canvas.on('mousedown', (event) => {
        isDrawing = true;
        [x, y] = [event.offsetX, event.offsetY];
    });

    canvas.on('mousemove', drawSig);

    canvas.on('mouseup', () => {
        isDrawing = false;
        let dataURL = canvas[0].toDataURL();
        hiddenInput.val(dataURL);
        console.log('dataURL: ', dataURL);
    });

    canvas.on('touchstart', (event) => {
        isDrawing = true;
        [x, y] = [event.offsetX, event.offsetY];
    });

    canvas.on('touchmove', drawSig);

    canvas.on('touchend', () => {
        isDrawing = false;
        let dataURL = canvas[0].toDataURL();
        hiddenInput.val(dataURL);
        console.log('dataURL: ', dataURL);
    });
})();
