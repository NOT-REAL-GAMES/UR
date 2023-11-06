struct VSOut {
    @builtin(position) Position: vec4f,
    @location(0) @interpolate(flat) color: u32,
};

    struct Uniforms {
    projMatrix: mat4x4<f32>
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@vertex
fn main(@location(0) inPos: vec3f) -> VSOut {
    var vsOut: VSOut;
    vsOut.Position = uniforms.projMatrix*vec4f(inPos, 1);
    vsOut.color = 4096;
    return vsOut;
}