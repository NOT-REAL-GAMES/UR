struct VSOut {
    @builtin(position) Position: vec4f,
    @location(0) color: vec3f,
    @location(1) uv: vec2f
};

    struct Uniforms {
    projMatrix: mat4x4<f32>
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@vertex
fn main(@location(0) inPos: vec3f,
        @location(1) inColor: vec3f,
        @location(2) uv: vec2f) -> VSOut {
    var vsOut: VSOut;
    vsOut.Position = uniforms.projMatrix*vec4f(inPos, 1);
    vsOut.uv = uv;
    vsOut.color = inColor;
    return vsOut;
}
		