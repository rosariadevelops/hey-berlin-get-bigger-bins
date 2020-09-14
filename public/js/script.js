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
    let isTouching = false;
    let x = 0;
    let y = 0;
    let touchX = 0;
    let touchY = 0;

    function drawSig(sig) {
        if (!isDrawing) return;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(sig.offsetX, sig.offsetY);
        ctx.stroke();
        [x, y] = [sig.offsetX, sig.offsetY];
    }

    function touchSig(sig) {
        if (!isTouching) return;
        ctx.beginPath();
        // part where it can tel if being touched
        ctx.moveTo(touchX - canvas.getBoundingClientRect().left, touchY - canvas.getBoundingClientRect().top);
        ctx.lineTo(touchX - canvas.getBoundingClientRect().left, touchY - canvas.getBoundingClientRect().top);
        ctx.stroke();
        [touchX, touchY] = [sig.touches[0].clientX, sig.touches[0].clientY];
        console.log('touchSig working');
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
        isTouching = true;
        [touchX, touchY] = [event.touches[0].clientX, event.touches[0].clientY];
    });

    canvas.on('touchmove', touchSig);

    canvas.on('touchend', () => {
        isTouching = false;
        let dataURL = canvas[0].toDataURL();
        hiddenInput.val(dataURL);
        console.log('dataURL: ', dataURL);
    });
})();
