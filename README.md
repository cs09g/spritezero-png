## spritezero-png

spritezero-like library for `.png` image resources.

### Why?

spritezero library requires `.svg` image resources for retina support.
But retina support is also possible with two sets of `.png` images(small and large).
for whom doesn't have `.svg` or who are not able to generate `.svg`, it would be a good alternative.

### How?

Prepare two sets of images for `sprite` and `sprite@2x` which has the same list of files.

#### CLI
`spritezeropng -o <out_folder> <path_for_sprite> <path_for_sprite@2x>`
