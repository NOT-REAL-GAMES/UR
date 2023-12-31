//ok, smart guy, let's see you take a crack at it!!!
//🧩 🧩

//NOTES FOR FUTURE REFERENCE:
//11/17/23
//fuuuck i really need to split up all this code uuuugh

import * as glm from './src/glm/index.js';
import * as jq from './src/jquery-3.7.1.js';

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
var transformBuffer2;
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

var objSelected;
var objSelectedNormal;
var objSelectedTriangle = -1;
var objSelectedTrianglePos = glm.vec3.create();

var currentOrientation = "Global";

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

	await setInterval(input,100);

	canvas = document.querySelector("#ur");
	adapter = await navigator.gpu.requestAdapter();
	device = await adapter.requestDevice({
		extensions: adapter.extensions
	});

	let params = `scrollbars=no,resizable=no,status=no,location=no,toolbar=no,menubar=no,
	width=512,height=512,left=-1000,top=-1000`;
	
	//TODO: add code to make this open up whenever an item is selected
	//tex_window = open("", "Texture Editor", params);
	
	
	//tex_canvas = document.createElement("canvas",HTMLCanvasElement);

	//tex_window.document.body.style = "margin: 0;";
	//tex_window.document.body.appendChild(tex_canvas);
	//tex_canvas.outerHTML = "<canvas id='cv'></canvas>";

	//tex_context = tex_canvas.getContext('2d');


	//tex_canvas.width = 512;
	//tex_canvas.height = 512;

	var imgData = new ImageData(
		tex_image,
		512,
		512,
		undefined
	);

	//tex_context.putImageData(imgData,0,0);

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

var objIndex = 0;

var depthTexDesc;
	
async function initializeScene(){

	debugx = glm.vec3.create();
	debugy = glm.vec3.create();
	debugz = glm.vec3.create();
	
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

	
	var defVert;
	var defFrag;

	await fetch("./src/default.vert").then((response) => response.text()).then((shader) => {defVert = shader;});	
	await fetch("./src/default.frag").then((response) => response.text()).then((shader) => {defFrag = shader;});	
	
	var pipelineLayoutDesc = {bindGroupLayouts: bindGroupLayout};
	var layout = device.createPipelineLayout(pipelineLayoutDesc);



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


			var pipelineDesc = {
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
					frontFace: 'ccw',
					cullMode: 'back',
					topology: 'triangle-list'
				},
				depthStencil: {
					depthWriteEnabled: true,
					depthCompare: 'less',
					format: 'depth24plus-stencil8'
				}
			};

			if(i==5||i==6||i==7){
				pipelineDesc.depthStencil.depthCompare = "not-equal"
			}

		
			pipelines.push(device.createRenderPipeline(pipelineDesc));

			models.push({
				pos: model.positions,
				col: model.colors,
				idx: model.indices,
				uv: model.uv,
				belongsToPipeline: i,
				materials: [{
					albedo: createSolidColorTexture(0.5,0.5,0.5,1)
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

	document.getElementById("ur").width = window.innerWidth*2/(1+deltaTime);
	document.getElementById("ur").height = window.innerHeight*2/(1+deltaTime);

	if (!navigator.gpu) {return;}

	await init();

	/*tex_window.onmousedown = function(e) {
		isPainting = true;
		startX = e.clientX;
		startY = e.clientY;
	};
	
	tex_window.onmouseup = function(e) {
		isPainting = false;
		tex_context.stroke();
		tex_context.beginPath();
	};
	
	tex_window.onmousemove = draw;*/

	await initializeScene();

	await render();

	//setInterval(() => {
	//	requestAnimationFrame(render);
	//}, 10);
}
	

async function updatePositionBuffers(checkTransform){

	if(checkTransform==true){
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
								
				scl = tf.scale[0];

				models[i].pos = scale(models[i].pos,scl);
								
				models[i].pos = move(models[i].pos,pos);

				
				var origin = glm.vec3.fromValues(tf.position[0],tf.position[1],tf.position[2]);

				models[i].pos = rotate(models[i].pos,glm.vec3.fromValues(
					tf.rotation[0]%360,tf.rotation[1]%360,tf.rotation[2]%360),origin);


				//models[i].pos = move(models[i].pos,camPos);

				glm.mat4.fromQuat(mat,rot);

			}
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

		//console.log(newpos.length);
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
		usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC,
	  });
	  device.queue.writeTexture({ texture }, data, {bytesPerRow:w*4}, { width: w, height: h });
	  return texture;
}

var ffs = glm.vec3.create();

var firstcol = glm.vec3.create()
var frontest = glm.vec3.create();
var normal = glm.vec3.create();

var debugx;
var debugy;
var debugz;

var Orientation = {
	Global: 'Global',
	Local: 'Local',
	Normal: 'Normal',
  };
  
	
var frontestObjIndex = -1;
var frontestTriIndex  = -1;
var frontestNormal = glm.vec3.create();

var x = glm.vec3.create();
var y = glm.vec3.create();
var z = glm.vec3.create();


async function render(){

	deltaTime = Date.now() / 1000 - now;
	
	//console.clear();

	//await setInterval(,500);
	
	gameCode();

	updatePositionBuffers(true);

	frontestObjIndex = -1;

	colorAttachment = {
		view: context.getCurrentTexture().createView(),
		clearValue: {r:1,g:0,b:.4,a:1},
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

	for(var i=0;i<models.length;++i){

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

	glm.mat4.translate(modelViewProjectionMatrix,modelViewProjectionMatrix,camPos);

	encoder = await device.createCommandEncoder();

	const pass = encoder.beginRenderPass(renderPassDesc);

	ffs = glm.vec3.create();

	frontest = glm.vec3.fromValues(99999,99999,99999);

	for(var i = 0;i<models.length;++i){	
		models[i].col = ogModels[i].col.slice();

		if(typeof models[i].idx==="undefined"){}
		else{
		//calculate raycast from camera to scene
			
			//TODO: add check to see if ray is within bounds of an object to prevent unnecessary calculations
			for(var j=0;j<models[i].idx.length;j+=3){
				//TODO: make raycast ignore list
				if(i==1){continue;}
				if(i==5){continue;}
				if(i==6){continue;}
				if(i==7){continue;}

				//TODO: make this a separate class

				var startPos = glm.vec3.fromValues(-camPos[0],-camPos[1],camPos[2]);
				var rotation = glm.vec3.fromValues(-camRot[0],camRot[1],camRot[2]);
				var len = 10000;

				var endPos = 
					glm.vec3.create();
					//glm.vec3.fromValues(0,0,1000);

					///57.296

				glm.vec3.add(endPos,startPos,
					glm.vec3.fromValues(
						len*Math.sin(rotation[1]),
						len*Math.tan(rotation[0]),
						len*Math.cos(rotation[1])
					)
				);

				//check if triangle intersects with line
				
				var dir = glm.vec3.create();
				glm.vec3.subtract(dir,endPos,startPos);

				//console.log(dir);

				var v1 = glm.vec3.fromValues(models[i].pos[models[i].idx[j]*3],models[i].pos[models[i].idx[j]*3+1],models[i].pos[models[i].idx[j]*3+2]);
				var v2 = glm.vec3.fromValues(models[i].pos[models[i].idx[j+1]*3],models[i].pos[models[i].idx[j+1]*3+1],models[i].pos[models[i].idx[j+1]*3+2]);
				var v3 = glm.vec3.fromValues(models[i].pos[models[i].idx[j+2]*3],models[i].pos[models[i].idx[j+2]*3+1],models[i].pos[models[i].idx[j+2]*3+2]);

				var u = glm.vec3.create();
				var v = glm.vec3.create();

				glm.vec3.subtract(u,v2,v1);
				glm.vec3.subtract(v,v3,v1);

				var n = glm.vec3.create();
				glm.vec3.cross(n,u,v);

				//glm.vec3.normalize(n,n);

				if (n==glm.vec3.create()) {console.log("degen tri"); continue;}

				var w0 = glm.vec3.create();
				glm.vec3.subtract(w0,startPos,v1);

				var a = -glm.vec3.dot(n,w0);
				var b = glm.vec3.dot(n,dir);


				if(b<0){continue;}
					
				if(Math.abs(b) < 0.00001){
					if(a==0){
						//console.log("parallel");
						continue;}
					else{
						//console.log("not intersecting");
						continue;}
				}



				var r = a/b;

				//console.log(r);

				if (r <= 0 || r >= 1){
					//console.log("not intersecting");
					continue;
				}

				var rv = glm.vec3.fromValues(r,r,r);

				var rd = glm.vec3.create();
				glm.vec3.multiply(rd,rv,dir);

				var ii = glm.vec3.create();
				glm.vec3.add(ii,startPos,rd);

				var uu = glm.vec3.dot(u,u);
				var uv = glm.vec3.dot(u,v);
				var vv = glm.vec3.dot(v,v);
				
				var w = glm.vec3.create();
				glm.vec3.subtract(w,ii,v1);

				var wu = glm.vec3.dot(w,u);
				var wv = glm.vec3.dot(w,v);

				var d = uv * uv - uu * vv;

				var s = (uv*wv-vv*wu) / d;
				if(s <= 0 || s > 1){
					//console.log("not intersecting");
					continue;
				}
				var t = (uv*wu-uu*wv) / d;
				
				
				if(t <= 0 || (s+t) > 1){
					//console.log("not intersecting");
					continue;
				}

				//console.log(ii);
				
				
				ffs = ii;
				if(glm.vec3.distance(startPos,ii)>=glm.vec3.distance(frontest,startPos)){
					continue;	
				}
				//console.log("BAP")
				frontest = ii;

				var bla = glm.vec3.dot(u,v)

				//glm.vec3.normalize(n,n);


				//atan2(atan2(z,x),atan2(x,z)) ??

				var pre;
				var nut;
				var rot;

				//glm.vec3.cross(x,n,w0);
				//glm.vec3.cross(y,n,ii);

				//glm.vec3.normalize(dir,dir);

				var nn = glm.vec3.create();
				glm.vec3.cross(nn,n,dir);

				glm.vec3.normalize(n,n);

				var zxy = Math.sqrt(z[0]*z[0]+z[1]*z[1]);

				pre = Math.tanh(n[1])
				nut = Math.acos(-n[1])
				rot = -Math.atan2(n[2],n[0]);

				//console.log(nut)
				frontestObjIndex = i;
				frontestTriIndex = j;
				frontestNormal = n;
				//console.log(pre+","+nut+","+rot);

				var blalb = glm.quat.create();
				//glm.quat.fromEuler(blalb,pre*57.296,nut*57.296,rot*57.296);
				
				glm.quat.rotateY(blalb,blalb,rot);
				glm.quat.rotateZ(blalb,blalb,nut);
				//glm.quat.rotateZ(blalb,blalb,nut);


				normal = glm.vec3.fromQuat(blalb);
				
				//normal = glm.vec3.fromValues(Math.asin(n[0])*57.296,Math.acos(n[1])*57.296,Math.atan(n[2])*57.296)

				//console.log(normal);


				if(i==objSelected){
					

				}
				

				//console.log("intersecting with triangle "+((j/3)+1)+" of object "+i);

				//*/
			}
		}

		for(var v=0;v<models[i].pos.length;v+=3){
			models[i].pos[v+2] *= -1;
		}

		await updatePositionBuffers(false);

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

		/*for(var v=0;v<models[i].pos.length;v+=3){
			models[i].pos[v+2] *= -1;
		}*/
		
	}

	pass.end();

	await device.queue.submit([encoder.finish()]);

	console.log()

	now = Date.now() / 1000;

	requestAnimationFrame(render);
	
}

var deltaTime = 0;

var held = new Map([]);

function clicked(e) {

    switch (e.button) {
        case 0:
			console.log(frontestObjIndex);
			//TODO: write unique class where all the data is stored
			objSelected = frontestObjIndex;
			objSelectedNormal = normal;
			
				
			objSelectedTriangle = frontestTriIndex;

          // left mouse button
          break;
        case 1:
          // middle mouse button
          break;
        case 2:
			if(!held.get("rclick")){
				held.set("rclick",true);
			}

			if (!document.pointerLockElement) {
				canvas.requestPointerLock({
				  unadjustedMovement: false,
				});
			  }    
			}
}

function unclicked(e) {
    switch (e.button) {
        case 0:
          // left mouse button
          break;
        case 1:
          // middle mouse button
          break;
        case 2:
			held.set("rclick",false);

			if(Math.abs(mmx)<1&&Math.abs(mmy)<1) {
				console.log("open menu");
			}

			mmx = 0;
			mmy = 0;

			if (document.pointerLockElement) {
				document.exitPointerLock();
			}    
			}
}

var mmx = 0,mmy = 0;
var mdx = 0,mdy = 0;

async function input(){

	canvas.addEventListener('mousedown', clicked, false);
	canvas.addEventListener('mouseup', unclicked, false);

	document.onmousedown = (e) => {
		e.preventDefault();
	}

	document.oncontextmenu = (e) => {
		e.preventDefault();
	}
	
	document.onmousemove = (e) => {
		mmx += e.movementX * .5;
		mdx += e.movementX * .5 / (1+Math.abs(mdx)*window.devicePixelRatio);
		mmy += e.movementY * .5;	
		mdy += e.movementY * .5 / (1+Math.abs(mdy));	
	};

	if(document.hidden){
		mdx = 0; mdy = 0;
	}

	document.addEventListener("keydown", function(e) {
		if ((window.navigator.userAgent.match("Mac") ? e.metaKey : e.ctrlKey)) {
		  e.preventDefault();
		  // Process the event here (such as click on submit button)
		}
	  }, false);
	  

	document.onkeydown = (event) =>{
		  const keyName = event.key;
	  
		if (keyName === "Control" || keyName === "Meta") {
			return;
		}
		
		if (window.navigator.userAgent.match("Mac") ? event.metaKey : event.ctrlKey) {
			alert(`Combination of ctrlKey + ${keyName}`);
			} else {
				held.set(keyName,true);
				//console.log(held.get(keyName));

			}	  
		};
		
		document.onkeyup = (event) =>{

			const keyName = event.key;
		
		  if (keyName === "Control" || keyName === "Meta") {
			  return;
		  }
		  
		  if (window.navigator.userAgent.match("Mac") ? event.metaKey : event.ctrlKey) {

			if(held.get("s")){
				event.preventDefault();
			}

			alert(`Combination of ctrlKey + ${keyName}`);
			} else {
				held.set(keyName,false);
				//console.log(held.get(keyName));
			  }	  
		  };

		  mdx = mdx + (0-mdx) * 8 * deltaTime;
		  mdy = mdy + (0-mdy) * 8 * deltaTime;

}

var camx = 0,camy = 0;

var heldLast = new Map([]);

var camrotx = 0, camroty = 0; 

async function gameCode(){

	gameObjects[0].transform.rotation[1] = now * 5;
	gameObjects[0].transform.rotation[2] = now * 5;

	//gameObjects[1].transform.rotation[1] = (now);

	gameObjects[1].transform.position = frontest;
	gameObjects[1].transform.rotation = normal;
	


	if(objSelected >= 0){

		var p = glm.vec3.create();

		var v1 = glm.vec3.fromValues(
			models[objSelected].pos[models[objSelected].idx[objSelectedTriangle]*3],
			models[objSelected].pos[models[objSelected].idx[objSelectedTriangle]*3+1],
			models[objSelected].pos[models[objSelected].idx[objSelectedTriangle]*3+2])
		var v2 =glm.vec3.fromValues(			
			models[objSelected].pos[models[objSelected].idx[objSelectedTriangle+1]*3],
			models[objSelected].pos[models[objSelected].idx[objSelectedTriangle+1]*3+1],
			models[objSelected].pos[models[objSelected].idx[objSelectedTriangle+1]*3+2])
		var v3 = glm.vec3.fromValues(			
			models[objSelected].pos[models[objSelected].idx[objSelectedTriangle+2]*3],
			models[objSelected].pos[models[objSelected].idx[objSelectedTriangle+2]*3+1],
			models[objSelected].pos[models[objSelected].idx[objSelectedTriangle+2]*3+2]);
		
		glm.vec3.add(p,p,v1);
		glm.vec3.add(p,p,v2);
		glm.vec3.add(p,p,v3);

		glm.vec3.divide(p,p,glm.vec3.fromValues(3,3,3));

		glm.vec3.multiply(p,p,glm.vec3.fromValues(1,1,-1))

		glm.vec3.multiply(v1,v1,glm.vec3.fromValues(1,1,-1))
		glm.vec3.multiply(v2,v2,glm.vec3.fromValues(1,1,-1))
		glm.vec3.multiply(v3,v3,glm.vec3.fromValues(1,1,-1))


		objSelectedTrianglePos = p;

		var s = glm.vec3.distance(camPos,objSelectedTrianglePos)*.2;
		
		if(currentOrientation===Orientation.Normal){
			var u = glm.vec3.create();
			var v = glm.vec3.create();

			glm.vec3.subtract(u,v2,v1);
			glm.vec3.subtract(v,v3,v1);

			var n = glm.vec3.create();
			glm.vec3.cross(n,u,v);
		
			glm.vec3.normalize(n,n);

			glm.vec3.cross(x,glm.vec3.fromValues(0,s,0),n);
			if(x[0]==0&&x[1]==0&&x[2]==0){x=glm.vec3.fromValues(s,0,0);}

			//glm.vec3.multiply(x,x,glm.vec3.fromValues(-1,-1,-1));

			glm.vec3.cross(y,x,n);
			glm.vec3.multiply(y,y,glm.vec3.fromValues(-s,-s,-s));
			glm.vec3.cross(z,x,y);
			glm.vec3.multiply(z,z,glm.vec3.fromValues(-s,-s,-s));

			glm.vec3.normalize(x,x);
			glm.vec3.normalize(y,y);
			glm.vec3.normalize(z,z);		
			
			gameObjects[5].transform.rotation = gameObjects[objSelected].transform.rotation;
			gameObjects[6].transform.rotation = gameObjects[objSelected].transform.rotation;
			gameObjects[7].transform.rotation = gameObjects[objSelected].transform.rotation;
	
		}	

		else if (currentOrientation===Orientation.Global){
			x = glm.vec3.fromValues(s,0,0);
			y = glm.vec3.fromValues(0,s,0);
			z = glm.vec3.fromValues(0,0,s);

			gameObjects[5].transform.rotation = glm.vec3.create();
			gameObjects[6].transform.rotation = glm.vec3.create();
			gameObjects[7].transform.rotation = glm.vec3.create();

		}

		glm.vec3.add(debugx,x,objSelectedTrianglePos);
		glm.vec3.add(debugy,y,objSelectedTrianglePos);
		glm.vec3.add(debugz,z,objSelectedTrianglePos);
	
		gameObjects[5].transform.position = debugx;
		gameObjects[6].transform.position = debugy;		
		gameObjects[7].transform.position = debugz;
		

		gameObjects[5].transform.scale = glm.vec3.fromValues(s/8,s/8,s/8);
		gameObjects[6].transform.scale = glm.vec3.fromValues(s/8,s/8,s/8);
		gameObjects[7].transform.scale = glm.vec3.fromValues(s/8,s/8,s/8);


	}
		//if(glm.vec3.distance(currentnormalx,gameObjects[objSelected].transform.position)>2){
		//}

	

	//console.log(tex_window!=null);

	/*if(!tex_window.closed){

		var blabla = tex_context.getImageData(0,0,512,512).data;
		
		var txarray = new Uint8Array(blabla.length);

		for(var j=0;j<blabla.length;++j){
			txarray[j]=blabla[j];
		}

		models[0].materials[0].albedo = writeTexture(txarray,512,512,'rgba8unorm');

	}*/
	
	models[5].materials[0].albedo = createCheckerColorTexture(1,0,0,1);
	models[6].materials[0].albedo = createCheckerColorTexture(0,1,0,1);
	models[7].materials[0].albedo = createCheckerColorTexture(0,0,1,1);
	models[1].materials[0].albedo = createCheckerColorTexture(1,1,1,1);

	camx = camx + (0-camx) * .25;
	camy = camy + (0-camy) * .25;

	//console.log(camx+","+camy);

	if(isNaN(camx)||Math.abs(camx)<0.001){camx = 0;}
	if(isNaN(camy)||Math.abs(camy)<0.001){camy = 0;}

	var temp = glm.vec3.create();

	if(held.get("rclick")){

		if (held.get("d")){
			camx += .5 * deltaTime
		}
		if (held.get("a")){
			camx -= .5 * deltaTime ;
		}
		if (held.get("w")){
			camy += .5 * deltaTime
		}
		if (held.get("s")){
			camy -= .5 * deltaTime
		}

		var camRotOld = camRot;

		mdx = mdx + (0-mdx)*.2;
		mdy = mdy + (0-mdy)*.2;

		camRot[0] = Math.min(Math.max(camRot[0]+ .15 * deltaTime * mdy, -1.57079), 1.57079)
		camRot[1] += .15 * deltaTime * mdx;
	
	}




	glm.vec3.add(temp,glm.vec3.fromValues(camPos[0],camPos[1],camPos[2]),
	glm.vec3.fromValues(
		-camx*(Math.cos(camRot[1])) + camy*(-Math.sin(camRot[1])*Math.cos(camRot[0])),
		camy*Math.sin(camRot[0]),
		-camx*(Math.sin(camRot[1])) + camy*(Math.cos(camRot[1])*Math.cos(camRot[0]))));
		//0));

	//console.log(camRot);

		camPos[0] = temp[0];
		camPos[1] = temp[1];
		camPos[2] = temp[2];
	
		heldLast = held;

	}

ur();