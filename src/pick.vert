struct VSOut {
    @builtin(position) Position: vec4f,
    @location(0) @interpolate(flat) color: u32,
};

    struct Uniforms {
    projMatrix: mat4x4<f32>
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<uniform> pickUniforms: u32;

@vertex
fn main(@location(0) inPos: vec3f,
        @location(1)  @interpolate(flat) inColor: u32) -> VSOut {
    var vsOut: VSOut;
    vsOut.Position = uniforms.projMatrix*vec4f(inPos, 1);
    vsOut.color = 4096;
    return vsOut;
}