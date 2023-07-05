async function ur(){
	if (!navigator.gpu) {return;}

	
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
		canvas.clientHeight * ratio
	];

	const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
	
	context.configure({ 
		device: device, 
		format: canvasFormat, 
		size: presentSize});
	
	// Clear the canvas with a render pass
	const encoder = device.createCommandEncoder();

	const v_data = new Float32Array([
		-0.5, -0.5, 0.0,
		 0.5, -0.5, 0.0,
		 0.0, 0.7, 0.0,
	 ]);

	const buffer = device.createBuffer({
		size: v_data.byteLength,
		usage: GPUBufferUsage.VERTEX,
	});

	const v_mod = device.createShaderModule({code:
		`
		@binding(0) @group(0) var<uniform> frame : u32;
		@vertex
		fn vtx_main(@builtin(vertex_index) vertex_index : u32) -> @builtin(position) vec4f {
  			const pos = array(
    			vec2( 0.0,  0.5),
    			vec2(-0.5, -0.5),
    			vec2( 0.5, -0.5)
  			);

  		return vec4f(pos[vertex_index], 0, 1);
		}

		@fragment
		fn frag_main() -> @location(0) vec4f {
  		return vec4(1, sin(f32(frame) / 128), 0, 1);
}

		`
	});

	const layout = device.createPipelineLayout({
		bindGroupLayouts: [],
	});

	const vertex = {
		module: v_mod,
		entryPoint:'vtx_main'

	};

	const rp = device.createRenderPipeline({
		layout: layout,
		primitive: {
			topology: "triangle-list"
		},
		fragment: {
			targets: [{
				format: 'rgba8unorm'
			}],
			module: v_mod,
			entryPoint: 'frag_main'
		},
		vertex: {
			buffers: [{
				arrayStride: 4*3,
				attributes: [{
					format: 'float32',
					offset:0,
					shaderLocation: 0
				}]
			}],
			module: v_mod,
			entryPoint: 'vtx_main'
		}

		});
  

	const pass = encoder.beginRenderPass({
		colorAttachments: [{
				view: context.getCurrentTexture().createView(),
				loadOp: "clear",
				clearValue: { r: 0, g: 0, b: 0, a: 1.0 },
				storeOp: "store",
			}]
	});

	pass.setPipeline(rp);
	pass.setVertexBuffer(0, buffer, [0]);
	pass.draw(3, 1, 0, 0);

	pass.end();

	device.queue.submit([encoder.finish()]);
}

ur();