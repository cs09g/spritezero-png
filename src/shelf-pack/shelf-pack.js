const ShelfPack = require("@mapbox/shelf-pack");
delete ShelfPack.prototype.packOne;

/**
 * Create a new Shelf.
 *
 * @private
 * @class  Shelf
 * @param  {number}  y   Top coordinate of the new shelf
 * @param  {number}  w   Width of the new shelf
 * @param  {number}  h   Height of the new shelf
 * @example
 * var shelf = new Shelf(64, 512, 24);
 */
function Shelf(y, w, h) {
  this.x = 0;
  this.y = y;
  this.w = this.free = w;
  this.h = h;
}


/**
* Allocate a single bin into the shelf.
*
* @private
* @param   {number}         w   Width of the bin to allocate
* @param   {number}         h   Height of the bin to allocate
* @param   {number|string}  id  Unique id of the bin to allocate
* @returns {Bin}            Bin object with `id`, `x`, `y`, `w`, `h` properties, or `null` if allocation failed
* @example
* shelf.alloc(12, 16, 'a');
*/
Shelf.prototype.alloc = function(w, h, id) {
  if (w > this.free || h > this.h) {
      return null;
  }
  var x = this.x;
  this.x += w;
  this.free -= w;
  return new Bin(id, x, this.y, w, h, w, this.h);
};


/**
* Resize the shelf.
*
* @private
* @param   {number}  w  Requested new width of the shelf
* @returns {boolean}    true
* @example
* shelf.resize(512);
*/
Shelf.prototype.resize = function(w) {
  this.free += (w - this.w);
  this.w = w;
  return true;
};


/**
* Create a new Bin object.
*
* @class  Bin
* @param  {number|string}  id      Unique id of the bin
* @param  {number}         x       Left coordinate of the bin
* @param  {number}         y       Top coordinate of the bin
* @param  {number}         w       Width of the bin
* @param  {number}         h       Height of the bin
* @param  {number}         [maxw]  Max width of the bin (defaults to `w` if not provided)
* @param  {number}         [maxh]  Max height of the bin (defaults to `h` if not provided)
* @example
* var bin = new Bin('a', 0, 0, 12, 16);
*/
function Bin(id, x, y, w, h, maxw, maxh) {
  this.id = id;
  this.x  = x;
  this.y  = y;
  this.w  = w;
  this.h  = h;
  this.maxw = maxw || w;
  this.maxh = maxh || h;
  this.refcount = 0;
}

ShelfPack.prototype.packOne = function(w, h, id) {
  var best = { freebin: -1, shelf: -1, waste: Infinity },
      y = 0,
      bin, shelf, waste, i;

  // if id was supplied, attempt a lookup..
  if (typeof id === 'string' || typeof id === 'number') {
      bin = this.getBin(id);
      if (bin) {              // we packed this bin already
          this.ref(bin);
          return bin;
      }
      if (typeof id === 'number') {
          this.maxId = Math.max(id, this.maxId);
      }
  } else {
      id = ++this.maxId;
  }

  // First try to reuse a free bin..
  for (i = 0; i < this.freebins.length; i++) {
      bin = this.freebins[i];

      // exactly the right height and width, use it..
      if (h === bin.maxh && w === bin.maxw) {
          return this.allocFreebin(i, w, h, id);
      }
      // not enough height or width, skip it..
      if (h > bin.maxh || w > bin.maxw) {
          continue;
      }
      // extra height or width, minimize wasted area..
      if (h <= bin.maxh && w <= bin.maxw) {
          waste = (bin.maxw * bin.maxh) - (w * h);
          if (waste < best.waste) {
              best.waste = waste;
              best.freebin = i;
          }
      }
  }

  // Next find the best shelf..
  for (i = 0; i < this.shelves.length; i++) {
      shelf = this.shelves[i];
      y += shelf.h;

      // not enough width on this shelf, skip it..
      if (w > shelf.free) {
          continue;
      }
      // exactly the right height, pack it..
      if (h === shelf.h) {
          return this.allocShelf(i, w, h, id);
      }
      // not enough height, skip it..
      if (h > shelf.h) {
          continue;
      }
      // extra height, minimize wasted area..
      if (h < shelf.h) {
          waste = (shelf.h - h) * w;
          if (waste < best.waste) {
              best.freebin = -1;
              best.waste = waste;
              best.shelf = i;
          }
      }
  }

  if (best.freebin !== -1) {
      return this.allocFreebin(best.freebin, w, h, id);
  }

  if (best.shelf !== -1) {
      return this.allocShelf(best.shelf, w, h, id);
  }

  // No free bins or shelves.. add shelf..
  if (h <= (this.h - y) && w <= this.w) {
      shelf = new Shelf(y, this.w, h);
      return this.allocShelf(this.shelves.push(shelf) - 1, w, h, id);
  }

  // No room for more shelves..
  // If `autoResize` option is set, grow the sprite as follows:
  //  * add `w` or `h` instead double whichever sprite dimension is smaller (`w1` or `h1`)
  //  * if sprite dimensions are equal, grow width before height
  //  * accomodate very large bin requests (big `w` or `h`)
  if (this.autoResize) {
      var h1, h2, w1, w2;

      h1 = h2 = this.h;
      w1 = w2 = this.w;

      if (w1 <= h1 || w > w1) {   // grow width..
          w2 = Math.max(w, w1) + w;
      }
      if (h1 < w1 || h > h1) {    // grow height..
          h2 = Math.max(h, h1) + h;
      }

      this.resize(w2, h2);
      return this.packOne(w, h, id);  // retry
  }

  return null;
};

module.exports = ShelfPack;