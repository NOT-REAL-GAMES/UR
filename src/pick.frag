struct PickUniforms{
    id: u32
};

struct VSOut {
    @builtin(position) Position: vec4f,
    @location(0) color: vec3f,
};

@group(0) @binding(1) var<uniform> pickUniforms: PickUniforms;

@fragment
fn main(@location(0) color : vec3<f32>) -> @location(0) u32 {
    return pickUniforms.id;
}