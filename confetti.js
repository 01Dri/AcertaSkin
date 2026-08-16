export function triggerConfetti() {
    const canvas = document.createElement("canvas");
    canvas.id = "confetti-canvas";
    canvas.style.position = "fixed";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.width = "100vw";
    canvas.style.height = "100vh";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "99999";
    document.body.appendChild(canvas);

    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;

    function resize() {
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
    }
    resize();

    const colors = [
        "#c8aa6e",
        "#f0e6d2",
        "#0ac8b9",
        "#e84057",
        "#5383e8",
        "#f39c12",
        "#2ecc71",
        "#9b59b6",
        "#ff7979",
        "#badc58"
    ];

    const particleCount = 160;
    const particles = [];

    for (let i = 0; i < particleCount; i++) {
        const startFromLeft = i % 2 === 0;
        const originX = startFromLeft ? canvas.width * 0.12 : canvas.width * 0.88;

        particles.push({
            x: originX,
            y: canvas.height * 0.92,
            vx: (startFromLeft ? 1 : -1) * (Math.random() * 12 + 6) * dpr + (Math.random() - 0.5) * 6 * dpr,
            vy: -(Math.random() * 16 + 14) * dpr,
            size: (Math.random() * 18 + 14) * dpr,
            color: colors[Math.floor(Math.random() * colors.length)],
            rotation: Math.random() * 360,
            rotationSpeed: (Math.random() - 0.5) * 14,
            gravity: 0.42 * dpr,
            drag: 0.965,
            opacity: 1,
            decay: Math.random() * 0.006 + 0.004,
            shape: Math.random() > 0.3 ? "rect" : "circle"
        });
    }

    let animationId;

    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let activeCount = 0;

        for (const p of particles) {
            if (p.opacity <= 0) continue;
            activeCount++;

            p.vx *= p.drag;
            p.vy = p.vy * p.drag + p.gravity;
            p.x += p.vx;
            p.y += p.vy;
            p.rotation += p.rotationSpeed;
            p.opacity -= p.decay;

            ctx.save();
            ctx.globalAlpha = Math.max(0, p.opacity);
            ctx.translate(p.x, p.y);
            ctx.rotate((p.rotation * Math.PI) / 180);
            ctx.fillStyle = p.color;

            if (p.shape === "rect") {
                ctx.fillRect(-p.size / 2, -p.size / 3.5, p.size, p.size * 0.6);
            } else {
                ctx.beginPath();
                ctx.arc(0, 0, p.size / 2.2, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }

        if (activeCount > 0) {
            animationId = requestAnimationFrame(render);
            return;
        }

        cancelAnimationFrame(animationId);
        canvas.remove();
    }

    render();
}
