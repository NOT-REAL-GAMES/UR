//ok, smart guy, let's see you take a crack at it!!!
//🧩 🧩

import * as glm from './src/glm/index.js';

var canvas; var adapter; var device;
var queue; var context; var pipelines = [];

var colorTex; var colorTexView;
var depthTex; var depthTexView;

var models = [];
var ogModels = [];
var modelsMeta = [];

var gameObjects = [];

var encoder;

var bindGroup = [];

var transformBuffer;
var bindGroupLayout = [];

var renderPassDesc;

var projectionMatrix = glm.mat4.create();

var now;

var url = window.location.href;

var fModule;
var vModule;

var cubeTexture;
var imageBitmap;

var colorAttachment;

var camPos = [0,0,-10];
var camRot = [0,0,0];

var tex_window;
var tex_canvas;
var tex_context;

var tex_image = new Array (0);

var isPainting = false;

for(var y=0;y<512;++y){
	for(var x=0;x<512;++x){
		tex_image.push(255);
		tex_image.push(0);
		tex_image.push(80);
		tex_image.push(255);
	}
}

tex_image = Uint8ClampedArray.from(tex_image);

//console.log(tex_image);

const transformSize = 4 * 16;
const transformBufferDescriptor = {
	size: transformSize,
	usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
};

const draw = (e) => {
    if(!isPainting) {
        return;
    }

	tex_window.console.log("drawign");

    tex_context.lineWidth = 5;
	tex_context.strokeStyle = "black";
    tex_context.lineCap = 'round';

    tex_context.lineTo(e.clientX, e.clientY);
    tex_context.stroke();
}

async function init(){
	now = Date.now();

	canvas = document.querySelector("#ur");
	adapter = await navigator.gpu.requestAdapter();
	device = await adapter.requestDevice({
		extensions: adapter.extensions
	});

	let params = `scrollbars=no,resizable=no,status=no,location=no,toolbar=no,menubar=no,
	width=512,height=512,left=-1000,top=-1000`;
	tex_window = open("", "Texture Editor", params);

	
	tex_canvas = document.createElement("canvas",HTMLCanvasElement);

	tex_window.document.body.style = "margin: 0;";
	tex_window.document.body.appendChild(tex_canvas);
	//tex_canvas.outerHTML = "<canvas id='cv'></canvas>";

	tex_context = tex_canvas.getContext('2d');


	tex_canvas.width = 512;
	tex_canvas.height = 512;

	var imgData = new ImageData(
		tex_image,
		512,
		512,
		undefined
	);

	tex_context.putImageData(imgData,0,0);

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

function transform(pos,rot){
	var vec = new Array(Math.floor(pos.length/3));
	for(var i = 0; i<pos.length;i+=3){
		vec[Math.floor(i/3)] = glm.vec3.fromValues(pos[i],pos[i+1],pos[i+2]);
		glm.vec3.transformMat4(vec[Math.floor(i/3)],vec[Math.floor(i/3)],rot);
	}
	
	var arr = new Array(pos.length);
	for(var i=0; i<arr.length;i+=3){
		arr[i] = vec[Math.floor(i/3)][0];
		arr[i+1] = vec[Math.floor(i/3)][1];
		arr[i+2] = vec[Math.floor(i/3)][2];
	}
	//console.log(arr);
	return arr;
}

function move(pos,off){
	var vec = new Array(Math.floor(pos.length/3));
	for(var i = 0; i<pos.length;i+=3){
		vec[Math.floor(i/3)] = glm.vec3.fromValues(pos[i],pos[i+1],pos[i+2]);
		glm.vec3.add(vec[Math.floor(i/3)],vec[Math.floor(i/3)],off);
	}
	
	var arr = new Array(pos.length);
	for(var i=0; i<arr.length;i+=3){
		arr[i] = vec[Math.floor(i/3)][0];
		arr[i+1] = vec[Math.floor(i/3)][1];
		arr[i+2] = vec[Math.floor(i/3)][2];
	}
	//console.log(arr);
	return arr;
}

function rotate(pos,off,origin){
	var vec = new Array(Math.floor(pos.length/3));
	for(var i = 0; i<pos.length;i+=3){
		vec[Math.floor(i/3)] = glm.vec3.fromValues(pos[i],pos[i+1],pos[i+2]);
		glm.vec3.rotateX(vec[Math.floor(i/3)],vec[Math.floor(i/3)],origin,off[0]*0.01745);		
		glm.vec3.rotateY(vec[Math.floor(i/3)],vec[Math.floor(i/3)],origin,off[1]*0.01745);
		glm.vec3.rotateZ(vec[Math.floor(i/3)],vec[Math.floor(i/3)],origin,off[2]*0.01745);
	}
	
	var arr = new Array(pos.length);
	for(var i=0; i<arr.length;i+=3){
		arr[i] = vec[Math.floor(i/3)][0];
		arr[i+1] = vec[Math.floor(i/3)][1];
		arr[i+2] = vec[Math.floor(i/3)][2];
	}
	//console.log(arr);
	return arr;
}

function scale(pos,scale){
	var vec = new Array(Math.floor(pos.length/3));
	for(var i = 0; i<pos.length;i+=3){
		vec[Math.floor(i/3)] = glm.vec3.fromValues(pos[i],pos[i+1],pos[i+2]);
		glm.vec3.scale(vec[Math.floor(i/3)],vec[Math.floor(i/3)],scale);
	}
	
	var arr = new Array(pos.length);
	for(var i=0; i<arr.length;i+=3){
		arr[i] = vec[Math.floor(i/3)][0];
		arr[i+1] = vec[Math.floor(i/3)][1];
		arr[i+2] = vec[Math.floor(i/3)][2];
	}
	//console.log(arr);
	return arr;
}

async function createBuffer(array,usage){
	//console.log((array.length* + 4) & ~3);
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
	//console.log(bla);
	const writeArray =
		usage == GPUBufferUsage.VERTEX
		? new Float32Array(bla)
		: new Uint16Array(bla);
	writeArray.set(array,0);
	buffer.unmap();
	return buffer;
}

var scene;

var pickPipeline;
var pickBindGroup = [];

var objIndex = 0;

var pickBindGroupLayout;

var depthTexDesc;

var pickBindGroupLayoutEntry = [{
			binding: 0,
			visibility: GPUShaderStage.FRAGMENT,
			texture: { sampleType: "uint" }
	}];
	
async function initializeScene(){
	
	await fetch('./src/test.scene').then((response) => response.json()).then((json) => {scene = json;});	

	console.log(scene.gameObjects);

	depthTexDesc = {
		size: [context.getCurrentTexture().width,context.getCurrentTexture().height,1], 
		dimension: '2d',
		format: 'depth24plus-stencil8',
		usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC
	};

	depthTex = device.createTexture(depthTexDesc);
	depthTexView = depthTex.createView();
	
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

	const uvBufDesc = {
		attributes: [{
			shaderLocation: 2,
			offset: 0,
			format: 'float32x2'
		}],
		arrayStride: 4*2,
		stepMode: 'vertex'
	};


	const transformBufferBindGroupLayoutEntry = [{
        binding: 0, // @group(0) @binding(0)
        visibility: GPUShaderStage.VERTEX,
        buffer: { type: "uniform" }
    }];

	const transformBufferBindGroupLayoutEntry2 = [{
        binding: 0, // @group(0) @binding(0)
        visibility: GPUShaderStage.FRAGMENT,
        sampler: { type: "filtering" }
    },{	
		binding: 1,
		visibility: GPUShaderStage.FRAGMENT,
		texture: { type: "float" }
	}];

	const bindGroupLayoutDescriptor = { entries: transformBufferBindGroupLayoutEntry };
	bindGroupLayout.push(device.createBindGroupLayout(bindGroupLayoutDescriptor));

	const bindGroupLayoutDescriptor2 = { entries: transformBufferBindGroupLayoutEntry2 };
	bindGroupLayout.push(device.createBindGroupLayout(bindGroupLayoutDescriptor2));

	//console.log(bindGroupLayout.length);

	

	var pickBindGroupLayoutDescriptor = { entries: [
		{
			binding: 0, 
			visibility: GPUShaderStage.VERTEX,
			buffer: { type: "uniform" }	
		}
		,
		{
			binding: 1,
			visibility: GPUShaderStage.FRAGMENT,
			buffer: { type: "uniform" }	
		}
	] };
	pickBindGroupLayout = device.createBindGroupLayout(pickBindGroupLayoutDescriptor);

	//create pick pipeline
	var defVert;
	var defFrag;

	var pickFrag;
	var pickVert;

	await fetch("./src/default.vert").then((response) => response.text()).then((shader) => {defVert = shader;});	
	await fetch("./src/default.frag").then((response) => response.text()).then((shader) => {defFrag = shader;});	

	await fetch("./src/pick.frag").then((response) => response.text()).then((shader) => {pickFrag = shader;});	
	await fetch("./src/pick.vert").then((response) => response.text()).then((shader) => {pickVert = shader;});	
	
	var pipelineLayoutDesc = {bindGroupLayouts: bindGroupLayout};
	var layout = device.createPipelineLayout(pipelineLayoutDesc);

	var pickPipelineLayoutDesc = {bindGroupLayouts: [pickBindGroupLayout]};
	var pickLayout = device.createPipelineLayout(pickPipelineLayoutDesc);


	const pickPipelineDesc = {
		layout: pickLayout,
		vertex: {
			module: device.createShaderModule({code:pickVert}),
			entryPoint: 'main',
			buffers: [posBufDesc]
		},
		fragment: {
			module: device.createShaderModule({code:pickFrag}),
			entryPoint: 'main',
			targets: [{format: 'r32uint'}]
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

	pickPipeline = device.createRenderPipeline(pickPipelineDesc);

	/*const texBindGroup = device.createBindGroup({
		layout: bindGroupLayout[1],
		entries: [ 
			  { binding: 0, resource: sampler },
			  { binding: 1, resource: models[i].materials[0].albedo.createView() },
		],
	  });*/

	for(var i = 0;i<scene.gameObjects.length;++i){
		if(scene.gameObjects[i].components.renderer!=null){

			var rd = scene.gameObjects[i].components.renderer;

			var model;
			console.log("model found");
			await fetch(rd.modelSource).then((response) => response.json()).then((json) => {model = json;});	
			gameObjects.push(scene.gameObjects[i]);
			console.log(model.uv);
			

			var vert; var frag;


			if(!rd.materials[0].customVertexCode){
				await fetch(rd.materials[0].vertex).then((response) => response.text()).then((shader) => {vert = shader;});	
			}
			if(!rd.materials[0].customFragmentCode){
				await fetch(rd.materials[0].fragment).then((response) => response.text()).then((shader) => {frag = shader;});	
			}
	
			vModule = device.createShaderModule({code:vert});
			fModule = device.createShaderModule({code:frag});
	
			//initialize pipelines here?
			//TODO: optimize pipeline creation

		
			const pipelineDesc = {
				layout: layout,
				vertex: {
					module: vModule,
					entryPoint: 'main',
					buffers: [posBufDesc,colBufDesc,uvBufDesc]
				},
				fragment: {
					module: fModule,
					entryPoint: 'main',
					targets: [{format: 'bgra8unorm'}]
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
		
			pipelines.push(device.createRenderPipeline(pipelineDesc));

			models.push({
				pos: model.positions,
				col: model.colors,
				idx: model.indices,
				uv: model.uv,
				belongsToPipeline: i,
				materials: [{
					albedo: createSolidColorTexture(1,1,1,1)
				}]
			})
			}
		}
	ogModels = new Array(models.length);
	for(var i = 0;i<models.length;++i){
		ogModels[i]= {
			pos: models[i].pos.slice(),
			col: models[i].col.slice(),
			idx: models[i].idx.slice(),
			uv: models[i].uv.slice()
		}
	}
}

async function ur(){
	if (!navigator.gpu) {return;}

	await init();

	tex_window.onmousedown = function(e) {
		isPainting = true;
		startX = e.clientX;
		startY = e.clientY;
	};
	
	tex_window.onmouseup = function(e) {
		isPainting = false;
		tex_context.stroke();
		tex_context.beginPath();
	};
	
	tex_window.onmousemove = draw;

	await initializeScene();

	render();
}

async function updatePositionBuffers(){

	for(var i = 0;i<models.length;++i){

		var tf = gameObjects[i].transform;
		
		if(true) {

				models[i].pos = ogModels[i].pos.slice();
				//console.log(models[i].pos === ogModels[i].pos);

				var mat = glm.mat4.create();
				var rot = glm.quat.create();
				var pos = glm.vec3.create();
				var scl = 1;

				pos = glm.vec3.fromValues(tf.position[0],tf.position[1],tf.position[2]);					
								
				scl = 1 + tf.scale[0];

				models[i].pos = scale(models[i].pos,scl);
								
				models[i].pos = move(models[i].pos,pos);
				
				var origin = glm.vec3.fromValues(tf.position[0],tf.position[1],tf.position[2]);

				models[i].pos = rotate(models[i].pos,glm.vec3.fromValues(
					tf.rotation[0]%360,tf.rotation[1]%360,tf.rotation[2]%360),origin);

				glm.mat4.fromQuat(mat,rot);

			}
	}

	modelsMeta = [];
	for(var i = 0;i<models.length;++i){
		var newpos = Array();
		var newcol = Array();
		var newidx = Array();
		for(var j=0;j<models[i].idx.length;){

			//console.log("triangle"+j/3);

			//console.log(models[i].idx[j]);

			var cur = models[i].idx[j];

			newpos.push(models[i].pos[cur*3])
			newpos.push(models[i].pos[(cur*3)+1])
			newpos.push(models[i].pos[(cur*3)+2])

			newcol.push(models[i].col[cur*3])
			newcol.push(models[i].col[cur*3+1])
			newcol.push(models[i].col[cur*3+2])
			

			newidx.push(j);
			++j;
		}

		modelsMeta.push({
			posBuf: await createBuffer(newpos, GPUBufferUsage.VERTEX),
			colBuf: await createBuffer(newcol, GPUBufferUsage.VERTEX),
			idxBuf: await createBuffer(newidx, GPUBufferUsage.INDEX),
			uvBuf: await createBuffer(models[i].uv, GPUBufferUsage.VERTEX)
		});
	}
}


function createCheckerColorTexture(r, g, b, a) {
	const data = new Uint8Array([
		0,       0,        0,    255,      0,       0,        0,    255,r * 255, g * 255, b * 255, a * 255,r * 255, g * 255, b * 255, a * 255,
		0,       0,        0,    255,      0,       0,        0,    255, r * 255, g * 255, b * 255, a * 255,r * 255, g * 255, b * 255, a * 255,
		r * 255, g * 255, b * 255, a * 255, r * 255, g * 255, b * 255, a * 255,      0,       0,        0,    255,      0,       0,        0,    255,
		r * 255, g * 255, b * 255, a * 255,r * 255, g * 255, b * 255, a * 255,      0,       0,        0,    255,      0,       0,        0,    255]);
	const texture = device.createTexture({
	  size: { width: 4, height: 4 },
	  format: "rgba8unorm",
	  usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
	});
	device.queue.writeTexture({ texture }, data, {bytesPerRow:16}, { width: 4, height: 4 });
	return texture;
  }


function createSolidColorTexture(r, g, b, a) {
	const data = new Uint8Array([
		r * 255, g * 255, b * 255, a * 255, r * 255, g * 255, b * 255, a * 255,r * 255, g * 255, b * 255, a * 255,r * 255, g * 255, b * 255, a * 255,
		r * 255, g * 255, b * 255, a * 255, r * 255, g * 255, b * 255, a * 255, r * 255, g * 255, b * 255, a * 255,r * 255, g * 255, b * 255, a * 255,
		r * 255, g * 255, b * 255, a * 255, r * 255, g * 255, b * 255, a * 255, r * 255, g * 255, b * 255, a * 255, r * 255, g * 255, b * 255, a * 255,
		r * 255, g * 255, b * 255, a * 255,r * 255, g * 255, b * 255, a * 255, r * 255, g * 255, b * 255, a * 255, r * 255, g * 255, b * 255, a * 255]);
	const texture = device.createTexture({
	  size: { width: 4, height: 4 },
	  format: "rgba8unorm",
	  usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
	});
	device.queue.writeTexture({ texture }, data, {bytesPerRow:16}, { width: 4, height: 4 });
	return texture;
  }

function writeTexture(data,w,h,format){
	const texture = device.createTexture({
		size: { width: w, height: h },
		format: format,
		usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
	  });
	  device.queue.writeTexture({ texture }, data, {bytesPerRow:w*4}, { width: w, height: h });
	  return texture;
}

async function render(){
	
	//console.clear();

	await gameCode();

	await updatePositionBuffers();


	colorAttachment = {
		view: context.getCurrentTexture().createView(),
		clearValue: {r:0,g:0,b:0,a:1},
		loadOp: 'clear',
		storeOp: 'store'
	};

	var pickTexture = device.createTexture({
		size: [context.getCurrentTexture().width,context.getCurrentTexture().height,1], 
		format: 'r32uint',
		usage: GPUTextureUsage.COPY_SRC | GPUTextureUsage.RENDER_ATTACHMENT
	});
	
	var pickColorAttachment = {
		view: pickTexture.createView(),
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

	var pickDepthTex = device.createTexture(depthTexDesc);
	var pickDepthTexView = pickDepthTex.createView();

	const pickDepthAttachment = {
		view: pickDepthTexView,
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
	
	var pickRenderPassDesc = {
		colorAttachments: [pickColorAttachment],
		depthStencilAttachment: pickDepthAttachment
	};
    
    transformBuffer = device.createBuffer(transformBufferDescriptor)
	
	const sampler = device.createSampler({
		addressModeU: 'repeat',
		addressModeV: 'repeat',
		magFilter: 'nearest',
		minFilter: 'nearest',
	  });

    const transformBufferBinding = {
        buffer: transformBuffer,
        offset: 0,
        size: transformSize
    };
    const transformBufferBindGroupEntry = [{
        binding: 0,
        resource: transformBufferBinding
    }];

	bindGroup= [];

	var pickEncoder = device.createCommandEncoder();

	for(var i=0;i<models.length;++i){

		const id = new Uint8Array([Math.floor((i+1)/16777216)%256,Math.floor((i+1)/65536)%256,Math.floor((i+1)/256)%256,(i+1)%256]);

		var depthid = device.createTexture({
			size: { width: 1, height: 1 },
			format: "r32uint",
			usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
		});
		depthid = writeTexture(id,1,1,"r32uint");
		  
		var idBuffer = await device.createBuffer({
			size: 4*4,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
		});

		var idSrc = await device.createBuffer({
			size: 4*4,
			usage: GPUBufferUsage.COPY_SRC,
			mappedAtCreation: true
		});
		var bla = await idSrc.getMappedRange();
		new Uint32Array(bla).set(id);

		//console.log(bla.slice(0)); //THIS IS WORKING
		await idSrc.unmap();
		pickEncoder.copyBufferToBuffer(idSrc, 0, idBuffer, 0, 4*4);

		
		//await idBuffer.mapAsync(GPUMapMode.READ);

		const idBufferBinding = {
			buffer: idBuffer,
			offset: 0,
			size: 4*4
		};
	
		pickBindGroup.push(device.createBindGroup({
			layout: pickBindGroupLayout,
			entries: [
				{binding: 0, resource: transformBufferBinding},
				{binding: 1, resource: idBufferBinding},

			]
		}));

		//console.log(bindGroupLayout[1]!=null);
		const texBindGroup = device.createBindGroup({
			layout: bindGroupLayout[1],
			entries: [ 
		  		{ binding: 0, resource: sampler },
		  		{ binding: 1, resource: models[i].materials[0].albedo.createView() },
			],
	  	});

		const bindGroupDescriptor = {
			layout: bindGroupLayout[0],
        	entries: transformBufferBindGroupEntry
		};

		bindGroup.push(device.createBindGroup(bindGroupDescriptor));
		bindGroup.push(texBindGroup);
	}

	glm.mat4.perspectiveZO(projectionMatrix, 2, canvas.clientWidth/canvas.clientHeight, 0.01, 1000000.0);

	var viewMatrix = glm.mat4.create();

	var modelViewProjectionMatrix = glm.mat4.create();
    glm.mat4.multiply(modelViewProjectionMatrix, projectionMatrix, viewMatrix);
	
	glm.mat4.rotateX(modelViewProjectionMatrix,modelViewProjectionMatrix,camRot[0]);
	glm.mat4.rotateY(modelViewProjectionMatrix,modelViewProjectionMatrix,camRot[1]);
	glm.mat4.rotateZ(modelViewProjectionMatrix,modelViewProjectionMatrix,camRot[2]);

	glm.mat4.translate(modelViewProjectionMatrix,modelViewProjectionMatrix,glm.vec3.fromValues(camPos[0],camPos[1],camPos[2]));

		
	const pickpass = pickEncoder.beginRenderPass(pickRenderPassDesc);

	//PICK PASS
	
	for(var i = 0;i<models.length;++i){		


		objIndex = i;

		pickpass.setPipeline(pickPipeline);
		pickpass.setBindGroup(0,pickBindGroup[i]);

		pickpass.setViewport(0,0,context.getCurrentTexture().width,context.getCurrentTexture().height,0,1);
		pickpass.setScissorRect(0,0,context.getCurrentTexture().width,context.getCurrentTexture().height);


		//console.log("drawing object "+i);

		//pickpass.setViewport(0,0,context.getCurrentTexture().width,context.getCurrentTexture().height,0,1);
		//pickpass.setScissorRect(0,0,context.getCurrentTexture().width,context.getCurrentTexture().height);

		device.queue.writeBuffer(transformBuffer, 0, modelViewProjectionMatrix);

		//pass.setPipeline(pipelines[i]);
		pickpass.setIndexBuffer(modelsMeta[i].idxBuf,'uint16');

		//pass.setBindGroup(0,i);
		//pass.setBindGroup(1,bindGroup[i*2+1]);

		pickpass.setVertexBuffer(0, modelsMeta[i].posBuf);
		pickpass.setVertexBuffer(1, modelsMeta[i].colBuf);
		pickpass.setVertexBuffer(2, modelsMeta[i].uvBuf);
		pickpass.drawIndexed(models[i].idx.length,1);	
		
	}

	pickpass.end();	
	
	var pickBuffer = await device.createBuffer({
		size: 256,
		usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
	});


	pickEncoder.copyTextureToBuffer({
		texture: pickTexture,
		origin: {
			x: 640,	//GET MOUSE POSITION
			y: 640	//AND PUT IT IN HERE
		}	// should return the id when you 
			// FIGURE OUT HOW THE FUCK TO GET
			// IT TO RECOGNIZE IT :))

			// i.e. DON'T CHANGE THIS YOU DUMB BASTARD
	}, {
		buffer: pickBuffer,
		bytesPerRow: 256,
	},{
		width: 1, 
		height:1
	}
	
	);

	console.log()

	await device.queue.submit([pickEncoder.finish()]);

	encoder = await device.createCommandEncoder();

	const pass = encoder.beginRenderPass(renderPassDesc);

	for(var i = 0;i<models.length;++i){	

		//console.log("PICK PASS: drawing object "+i);

		pass.setViewport(0,0,context.getCurrentTexture().width,context.getCurrentTexture().height,0,1);
		pass.setScissorRect(0,0,context.getCurrentTexture().width,context.getCurrentTexture().height);

		device.queue.writeBuffer(transformBuffer, 0, modelViewProjectionMatrix);

		pass.setPipeline(pipelines[i]);
		pass.setIndexBuffer(modelsMeta[i].idxBuf,'uint16');

		pass.setBindGroup(0,bindGroup[i*2]);
		pass.setBindGroup(1,bindGroup[i*2+1]);

		pass.setVertexBuffer(0, modelsMeta[i].posBuf);
		pass.setVertexBuffer(1, modelsMeta[i].colBuf);
		pass.setVertexBuffer(2, modelsMeta[i].uvBuf);
		pass.drawIndexed(models[i].idx.length,1);	
		
	}

	pass.end();

	await device.queue.submit([encoder.finish()]);

	requestAnimationFrame(render);

	deltaTime = Date.now() / 1000 - now;
	//console.log(deltaTime);

	now = Date.now() / 1000;
	
	await pickBuffer.mapAsync(GPUMapMode.READ);
	var selectedid = await pickBuffer.getMappedRange();
	console.log(selectedid.slice(0));

	await pickBuffer.unmap();

}

var deltaTime = 0;

var held = new Map([]);

async function input(){
	document.onkeydown = (event) =>{
		  const keyName = event.key;
	  
		if (keyName === "Control") {
			return;
		}
		
		if (event.ctrlKey) {
			alert(`Combination of ctrlKey + ${keyName}`);
			} else {
				held.set(keyName,true);
				//console.log(held.get(keyName));
			}	  
		};
		
		document.onkeyup = (event) =>{
			const keyName = event.key;
		
		  if (keyName === "Control") {
			  return;
		  }
		  
		  if (event.ctrlKey) {

			alert(`Combination of ctrlKey + ${keyName}`);
			} else {
				held.set(keyName,false);
				//console.log(held.get(keyName));
			  }	  
		  };

}

async function gameCode(){
		
	setInterval(input,10);

	//gameObjects[0].transform.rotation[0] = now * 5;

	gameObjects[1].transform.rotation[1] = (now);

	//console.log(tex_window!=null);

	if(!tex_window.closed){

		var blabla = tex_context.getImageData(0,0,512,512).data;
		
		var txarray = new Uint8Array(blabla.length);

		for(var j=0;j<blabla.length;++j){
			txarray[j]=blabla[j];
		}

		models[0].materials[0].albedo = writeTexture(txarray,512,512,'rgba8unorm');

	}
	
	models[1].materials[0].albedo = createCheckerColorTexture(1,0,1,1);

	if (held.get("a")){
		camPos[0] -= 5 * deltaTime
	}
	if (held.get("d")){
		camPos[0] += 5 * deltaTime
	}
	if (held.get("w")){
		camPos[2] -= 5 * deltaTime
	}
	if (held.get("s")){
		camPos[2] += 5 * deltaTime
	}

	if (held.get("q")){
		camRot[1] -= 5 * deltaTime
	}
	if (held.get("e")){
		camRot[1] += 5 * deltaTime
	}

}

ur();