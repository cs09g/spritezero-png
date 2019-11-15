"use strict";

const files = document.querySelectorAll(".files");
const generateButton = document.querySelector("#generate");
const resultSection = document.querySelector("#result");

generateButton.addEventListener("click", generateSprites);

let spritesInfo = [];
function generateSprites() {
  resultSection.innerHTML = "";
  spritesInfo = [];
  files.forEach(async (file, index) => {
    if (file.files.length) {
      await generateSprite(file.files, { pixelRatio: index + 1 });
    }
  });
}

function generateSprite(files, options = { pixelRatio: 1 }) {
  const fileLoadQueue = d3.queue(16);

  const filesInfo = {};
  const filesMapper = {};
  let numOfFiles = files.length;

  Array.prototype.slice.apply(files).forEach((file) => {
    fileLoadQueue.defer(loadFile, file, filesMapper, filesInfo);
  });

  fileLoadQueue.awaitAll(() => {
    const imagesInfo = layoutSprite(filesInfo);
    spritesInfo.push(imagesInfo);

    const canvas = generateCanvas(imagesInfo, filesMapper);
    const textarea = generateJSON(imagesInfo, options.pixelRatio);

    setupResultUI(canvas, textarea);
  });
}

function loadFile(file, filesMapper, filesInfo, callback) {
  const reader = new FileReader();
  const fileName = file.name.split(".png")[0];
  reader.onload = (f) => {
    const img = new Image;
    img.src = f.target.result;
    img.onload = (e) => {
      filesMapper[fileName] = e.target.src;
      filesInfo[fileName] = {
        width: e.target.width,
        height: e.target.height,
      };
      callback();
    }
  };

  reader.readAsDataURL(file);
}

function layoutSprite(filesInfo) {
  const sprite = new ShelfPack(1, 1, { autoResize: true });
  let imagesInfo = Object.keys(filesInfo).map((file) => {
    return {
      id: file,
      width: filesInfo[file].width,
      height: filesInfo[file].height,
      pixelRatio: 1,
    };
  });

  imagesInfo = imagesInfo.sort((a, b) => b.width * b.height - a.width * a.height);
  sprite.pack(imagesInfo, { inPlace: true });

  return imagesInfo;
}

function generateCanvas(imagesInfo, filesMapper) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(...imagesInfo.map((imageInfo) => imageInfo.x + imageInfo.width));
  canvas.height = Math.max(...imagesInfo.map((imageInfo) => imageInfo.y + imageInfo.height));

  const ctx = canvas.getContext("2d");
  
  for (let i = 0, len = imagesInfo.length; i < len; i++) {
    const img = new Image();
    img.src = filesMapper[imagesInfo[i].id];
    img.onload = function() {
      ctx.drawImage(img, imagesInfo[i].x, imagesInfo[i].y, imagesInfo[i].width, imagesInfo[i].height);
    };
  }

  return canvas;
}

function generateJSON(imagesInfo, pixelRatio) {
  const spriteJSON = {};
  
  imagesInfo.forEach((imageInfo) => {
    if (pixelRatio !== 1 && spritesInfo[0]) {
      const originalImageInfo = spritesInfo[0].find((originalSpriteInfo) => originalSpriteInfo.id === imageInfo.id);
      const originalSize = Math.min(originalImageInfo.width, originalImageInfo.height);
      imageInfo.pixelRatio = +(imageInfo.height / originalSize).toFixed(3);
    }

    spriteJSON[isNaN(+imageInfo.id) ? imageInfo.id : +imageInfo.id + ""] = {
      pixelRatio: imageInfo.pixelRatio,
      width: imageInfo.width,
      height: imageInfo.height,
      x: imageInfo.x,
      y: imageInfo.y,
    };
  });

  const textarea = document.createElement("textarea");
  textarea.value = JSON.stringify(spriteJSON);
  return textarea;
}

function setupResultUI(canvas, textarea) {
  textarea.classList.add("right");

  const subSection = document.createElement("div");
  subSection.classList.add("sub-section");

  const left = document.createElement("div");
  left.classList.add("left");

  const right = document.createElement("div");
  right.classList.add("right");

  left.appendChild(canvas);
  subSection.appendChild(left);

  subSection.appendChild(textarea);
  resultSection.appendChild(subSection);
}