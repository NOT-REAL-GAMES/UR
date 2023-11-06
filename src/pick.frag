struct PickUniforms{
    id: u32
};

struct VSOut {
    @builtin(position) Position: vec4f,
    @location(0) @interpolate(flat) color: u32,
};

@group(0) @binding(1) var<uniform> pickUniforms: PickUniforms;

@fragment
fn main(@location(0) @interpolate(flat) color : u32) -> @location(0) @interpolate(flat) u32 {
    return (pickUniforms.id);
}