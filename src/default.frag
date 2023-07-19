@group(1) @binding(0) var ourSampler: sampler;
@group(1) @binding(1) var ourTexture: texture_2d<f32>;

@fragment
fn main(
    @location(0) color : vec3<f32>,
    @location(1) uv : vec2<f32>) -> @location(0) vec4f {
    
    return vec4f(color, 1)/2 + textureSample(ourTexture, ourSampler, uv)/2;
}