var canvas;
var adapter;
var device;

var queue;

var context;

var pipeline;

var colorTex;
var colorTexView;

var depthTex;
var depthTexView;

var posBuf;
var colBuf;
var idxBuf;

var encoder;

var url = window.location.href;

async function init(){
	canvas = document.querySelector("#ur");
	adapter = await navigator.gpu.requestAdapter();
	device = await adapter.requestDevice({
		extensions: adapter.extensions
	});

	queue = device.queue;
	context = canvas.getContext("webgpu");

	const ratio = window.devicePixelRatio || 1;
	const presentSize = [
		canvas.clientWidth * ratio, 
		canvas.clientHeight * ratio
	];

	const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
	
	context.configure({ 
		device: device, 
		format: canvasFormat, 
		size: presentSize,
		usage: 
			GPUTextureUsage.RENDER_ATTACHMENT |
			GPUTextureUsage.COPY_SRC,
		alphaMode: 'opaque'
	});
}

async function createPipeline(){	
	posBuf = await createBuffer(mdl["positions"], GPUBufferUsage.VERTEX);
	colBuf = await createBuffer(mdl["colors"], GPUBufferUsage.VERTEX);
	idxBuf = await createBuffer(mdl["indices"], GPUBufferUsage.INDEX);

	const vModule = device.createShaderModule({code:
		`
		struct VSOut {
			@builtin(position) Position: vec4f,
			@location(0) color: vec3f,
		 };
		
		@vertex
		fn main(@location(0) inPos: vec3f,
				@location(1) inColor: vec3f) -> VSOut {
			var vsOut: VSOut;
			vsOut.Position = vec4f(inPos, 1);
			vsOut.color = inColor;
			return vsOut;
		}
		
		`
	});

	const fModule = device.createShaderModule({code:
		`
		@fragment
		fn main(@location(0) inColor: vec3f) -> @location(0) vec4f {
    		return vec4f(inColor, 1);
		}

		`
	});

	const posBufDesc = {
		attributes: [{
			shaderLocation: 0,
			offset: 0,
			format: 'float32x3'
		}],
		arrayStride: 4*3,
		stepMode: 'vertex'
	};

	const colBufDesc = {
		attributes: [{
			shaderLocation: 1,
			offset: 0,
			format: 'float32x3'
		}],
		arrayStride: 4*3,
		stepMode: 'vertex'
	};

	const depthStencil = {
		depthWriteEnabled: true,
		depthCompare: 'less',
		format: 'depth24plus-stencil8'
	};

	const pipelineLayoutDesc = {bindGroupLayouts: []};
	const layout = device.createPipelineLayout(pipelineLayoutDesc);

	const vertex = {
		module: vModule,
		entryPoint: 'main',
		buffers: [posBufDesc,colBufDesc]
	};

	const colorState = {format: 'bgra8unorm'};

	const fragment = {
		module: fModule,
		entryPoint: 'main',
		targets: [colorState]
	};

	const primitive = {
		frontFace: 'cw',
		cullMode: 'none',
		topology: 'triangle-list'
	};

	const pipelineDesc = {
		layout: layout,
		vertex: vertex,
		fragment: fragment,
		primitive: primitive,
		depthStencil: depthStencil
	};

	pipeline = device.createRenderPipeline(pipelineDesc);
}

async function createBuffer(array,usage){
	let desc = {
		size: (array.byteLength + 3) & ~3,
		usage,
		mappedAtCreation: true
	};
	let buffer = device.createBuffer(desc);
	//TODO: write switch case for every possible usage.
	const writeArray =
		usage == GPUBufferUsage.VERTEX
		? new Float32Array(buffer.getMappedRange())
		: new Uint16Array(buffer.getMappedRange());
	writeArray.set(array);
	buffer.unmap();
	return buffer;
}

var mdl;
fetch(url+'./src/test.json').then((response) => response.json()).then((json) => mdl = json);
console.log(mdl);
console.log(mdl["positions"]);

async function ur(){
	if (!navigator.gpu) {return;}

	await init();

	const depthTexDesc = {
		size: [canvas.width, canvas.height, 1],
		dimension: '2d',
		format: 'depth24plus-stencil8',
		usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC
	};

	depthTex = device.createTexture(depthTexDesc);
	depthTexView = depthTex.createView();


	await createPipeline();
		
	colTex = context.getCurrentTexture();
	colTexView = colTex.createView();

	let colorAttachment = {
		view: colTexView,
		clearValue: {r:0,g:0,b:0,a:1},
		loadOp: 'clear',
		storeOp: 'store'
	};

	const depthAttachment = {
		view: depthTexView,
		depthClearValue: 1,
		depthLoadOp: 'clear',
		depthStoreOp: 'store',
		stencilClearValue: 0,
		stencilLoadOp: 'clear',
		stencilStoreOp: 'store'
	}

	const renderPassDesc = {
		colorAttachments: [colorAttachment],
		depthStencilAttachment: depthAttachment
	};

	encoder = device.createCommandEncoder();

	const pass = encoder.beginRenderPass(renderPassDesc);
	pass.setPipeline(pipeline);

	pass.setViewport(
		0,
		0,
		canvas.width,
		canvas.height,
		0,
		1
	);
	pass.setScissorRect(
		0,
		0,
		canvas.width,
		canvas.height
	);

	pass.setVertexBuffer(0, posBuf);
	pass.setVertexBuffer(1, colBuf);
	pass.setIndexBuffer(idxBuf,'uint16');
	pass.drawIndexed(indices.length,1);
	pass.end();

	device.queue.submit([encoder.finish()]);
}

ur();