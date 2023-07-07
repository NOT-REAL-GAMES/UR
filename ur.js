import * as glm from './src/index.js';

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

var bindGroup;

var transformBuffer;
var bindGroupLayout;

var renderPassDesc;

var projectionMatrix = glm.mat4.create();


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

	glm.mat4.perspective(projectionMatrix, (2 * Math.PI) / 5, canvas.clientWidth/canvas.clientHeight, 0.01, 10000.0);

}

async function createPipeline(){	
	posBuf = await createBuffer(mdl.model.positions, GPUBufferUsage.VERTEX);
	colBuf = await createBuffer(mdl.model.colors, GPUBufferUsage.VERTEX);
	idxBuf = await createBuffer(mdl.model.indices, GPUBufferUsage.INDEX);

	const vModule = device.createShaderModule({code:
		`
		struct VSOut {
			@builtin(position) Position: vec4f,
			@location(0) color: vec3f,
		};

		 struct Uniforms {
			projMatrix: mat4x4<f32>
		}
		
		@group(0) @binding(0) var<uniform> uniforms: Uniforms;

		@vertex
		fn main(@location(0) inPos: vec3f,
				@location(1) inColor: vec3f) -> VSOut {
			var vsOut: VSOut;
			let matrix = mat4x4f(
				1,0,0,0,
				0,1,0,0,
				0,0,1,0,
				0,0,1,1
			);
			vsOut.Position = uniforms.projMatrix*vec4f(inPos, 1);
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

	const transformBufferBindGroupLayoutEntry = {
        binding: 0, // @group(0) @binding(0)
        visibility: GPUShaderStage.VERTEX,
        buffer: { type: "uniform" },
    };
    const bindGroupLayoutDescriptor = { entries: [transformBufferBindGroupLayoutEntry] };
    bindGroupLayout = device.createBindGroupLayout(bindGroupLayoutDescriptor);


	const pipelineLayoutDesc = {bindGroupLayouts: [bindGroupLayout]};
	const layout = device.createPipelineLayout(pipelineLayoutDesc);

	const colorState = {format: 'bgra8unorm'};
	const pipelineDesc = {
		layout: layout,
		vertex: {
			module: vModule,
			entryPoint: 'main',
			buffers: [posBufDesc,colBufDesc]
		},
		fragment: {
			module: fModule,
			entryPoint: 'main',
			targets: [colorState]
		},
		primitive: {
			frontFace: 'cw',
			cullMode: 'back',
			topology: 'triangle-list'
		},
		depthStencil: {
			depthWriteEnabled: true,
			depthCompare: 'less',
			format: 'depth24plus-stencil8'
		}
	};

	pipeline = device.createRenderPipeline(pipelineDesc);
}

async function createBuffer(array,usage){
	console.log((array.length* + 4) & ~3);
	let mult = usage == GPUBufferUsage.VERTEX ?
		4 : 4;
	let desc = {
		size: (array.length*mult) & ~3,
		usage,
		mappedAtCreation: true
	};
	let buffer = await device.createBuffer(desc);
	//TODO: write switch case for every possible usage.
	let bla = (buffer.getMappedRange());
	console.log(bla);
	const writeArray =
		usage == GPUBufferUsage.VERTEX
		? new Float32Array(bla)
		: new Uint16Array(bla);
	writeArray.set(array,0);
	buffer.unmap();
	return buffer;
}

var mdl;

async function ur(){
	if (!navigator.gpu) {return;}

	await init();

	await fetch('./src/test.json').then((response) => response.json()).then((json) => {mdl = json;});	

	const depthTexDesc = {
		size: [canvas.width, canvas.height, 1],
		dimension: '2d',
		format: 'depth24plus-stencil8',
		usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC
	};

	depthTex = device.createTexture(depthTexDesc);
	depthTexView = depthTex.createView();


	await createPipeline();


	
	render();
}

async function render(){

	colorTex = context.getCurrentTexture();
	colorTexView = colorTex.createView();

	let colorAttachment = {
		view: colorTexView,
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

	renderPassDesc = {
		colorAttachments: [colorAttachment],
		depthStencilAttachment: depthAttachment
	};
	
    const transformSize = 4 * 16;
    const transformBufferDescriptor = {
        size: transformSize,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    };
    transformBuffer = device.createBuffer(transformBufferDescriptor)

    const transformBufferBinding = {
        buffer: transformBuffer,
        offset: 0,
        size: transformSize
    };
    const transformBufferBindGroupEntry = {
        binding: 0,
        resource: transformBufferBinding
    };
    const bindGroupDescriptor = {
        layout: bindGroupLayout,
        entries: [transformBufferBindGroupEntry]
    };
    bindGroup = device.createBindGroup(bindGroupDescriptor);

	glm.mat4.perspectiveZO(projectionMatrix, 2, canvas.clientWidth/canvas.clientHeight, 0.01, 10000.0);

	const viewMatrix = glm.mat4.create();
    glm.mat4.translate(viewMatrix, viewMatrix, glm.vec3.fromValues(0, 0, -5));
    const now = Date.now() / 1000;
    glm.mat4.rotate(viewMatrix, viewMatrix, now, glm.vec3.fromValues(1, 1, 0));
    const modelViewProjectionMatrix = glm.mat4.create();
    glm.mat4.multiply(modelViewProjectionMatrix, projectionMatrix, viewMatrix);
    device.queue.writeBuffer(transformBuffer, 0, modelViewProjectionMatrix);

	encoder = device.createCommandEncoder();
	const pass = encoder.beginRenderPass(renderPassDesc);

	pass.setBindGroup(0,bindGroup);

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
	pass.drawIndexed(mdl.model.indices.length,1);
	pass.end();

	await device.queue.submit([encoder.finish()]);

	requestAnimationFrame(render);
	
}

ur();