struct VSOut {
    @location(0) @interpolate(flat) color: u32,
};

struct Uniforms {
    projMatrix: mat4x4<f32>
}

@group(0) @binding(1) var<uniform> pickUniforms: u32;

@fragment
fn main(
        @location(0) @interpolate(flat) inColor: u32) -> VSOut {
    var vsOut: VSOut;
    vsOut.color = pickUniforms;

    return vsOut;
}