async function ur(){
	if (!navigator.gpu) {return;}

	const VS_SRC = `
	#version 300 es
	layout(location = 0) in vec2 a_pos;

	void main() {
		gl_Position = vec4(a_pos, 0, 1);
	}
	`.trim();

	const FS_SRC = `
	#version 300 es
	out lowp vec4 fd_color;

	void main() {
		fd_color = vec4(1, 0.3, 0.3, 1);
	}
	`.trim();

	const canvas = document.querySelector("#ur");
	const adapter = await navigator.gpu.requestAdapter();
	const device = await adapter.requestDevice({
		extensions: adapter.extensions
	});

	const queue = device.queue;
	const context = canvas.getContext("webgpu");

	const ratio = window.devicePixelRatio || 1;
	const presentSize = [
		canvas.clientWidth * ratio,
		canvas.clientHeight * ratio,
	];

	const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
	context.configure({ device: device, format: canvasFormat, size: presentSize});
	

	// Clear the canvas with a render pass
	const encoder = device.createCommandEncoder();



	const pass = encoder.beginRenderPass({
		colorAttachments: [{
				view: context.getCurrentTexture().createView(),
				loadOp: "clear",
				clearValue: { r: 0, g: 0, b: 0.0, a: 1.0 },
				storeOp: "store",
			}]
	});

	pass.end();

	device.queue.submit([encoder.finish()]);
}

ur();