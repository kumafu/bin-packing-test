/******************************************************************************

 This is a demo page to experiment with binary tree based
 algorithms for packing blocks into a single 2 dimensional bin.

 See individual .js files for descriptions of each algorithm:

  * packer.js         - simple algorithm for a fixed width/height bin
  * packer.growing.js - complex algorithm that grows automatically

 TODO
 ====
  * step by step animated render to watch packing in action (and help debug)
  * optimization - mark branches as "full" to avoid walking them
  * optimization - dont bother with nodes that are less than some threshold w/h (2? 5?)

*******************************************************************************/

var placedRects;
var g_blocks;
var area;

Demo = {

  init: function() {

    Demo.el = {
      examples: $('#examples'),
      blocks:   $('#blocks'),
      canvas:   $('#canvas')[0],
      size:     $('#size'),
      zoom:     $('#zoom'),
      label:    $('#label'),
      sort:     $('#sort'),
      button:   $('#btn_re'),
      color:    $('#color'),
      ratio:    $('#ratio'),
      nofit:    $('#nofit')
    };

    if (!Demo.el.canvas.getContext) // no support for canvas
      return false;

    Demo.el.draw = Demo.el.canvas.getContext("2d");
    Demo.el.blocks.val(Demo.blocks.serialize(Demo.blocks.examples.current()));
    Demo.el.blocks.change(Demo.run);
    Demo.el.size.change(Demo.run);
    Demo.el.zoom.change(Demo.redraw);
    Demo.el.label.change(Demo.redraw);
    Demo.el.sort.change(Demo.run);
    Demo.el.color.change(Demo.run);
    Demo.el.button.click(Demo.run);
    Demo.el.examples.change(Demo.blocks.examples.change);
    Demo.run();

    Demo.el.blocks.keypress(function(ev) {
      if (ev.which == 13)
        Demo.run(); // run on <enter> while entering block information
    });
  },

  //---------------------------------------------------------------------------

  redraw: function() {
    Demo.canvas.reset(area.x*2, area.y*2);
    Demo.canvas.blocks(placedRects);
    //Demo.report(g_blocks, g_packer.root.w, g_packer.root.h);
  },


  //---------------------------------------------------------------------------

  run: function() {
    var size = Demo.el.size.val();
    var zoom = parseInt(Demo.el.zoom.val());
    var dims = size.split("x");
    var cw = parseInt(dims[0]);
    var ch = parseInt(dims[1]);
    Demo.el.canvas.width = cw * zoom;
    Demo.el.canvas.height = ch * zoom;
    area = new binpacking.Rect(cw/2,ch/2,cw - 5,ch - 5);

    g_blocks = [];

    g_blocks = Demo.blocks.deserialize(Demo.el.blocks.val(), cw, ch);

    Demo.sort.now(g_blocks);

    returnRects = binpacking.pack(area, g_blocks, 10);
    // for (var i = 0; i < placedRects.length;i++){
    //   placedRects[i].draw(Demo.el.draw);
    // }

    Demo.canvas.reset(cw, ch);
    Demo.canvas.blocks(returnRects[0]);
    Demo.report(returnRects, cw, ch);
  },

  //---------------------------------------------------------------------------

  packer: function() {
    var size = Demo.el.size.val();
    if (size == 'automatic') {
      return new GrowingPacker();
    }
    else {
      var dims = size.split("x");
      return new Packer(parseInt(dims[0]), parseInt(dims[1]));
    }
  },

  //---------------------------------------------------------------------------

  report: function(blocks, w, h) {
    var fit = 0, nofit = [], block, n, len = blocks.length;
    for (var i in blocks[0]) {
      fit = fit + blocks[0][i].area;
    }
    for (var i in blocks[1]) {
      block = blocks[1][i];
      nofit.push("" + block.getProperty("name") + "("+block.width + "x" + block.height+")");
    }
    Demo.el.ratio.text(Math.round(100 * fit / (w * h)));
    Demo.el.nofit.html("Did not fit (" + nofit.length + ") :<br>" + nofit.join(", ")).toggle(nofit.length > 0);
  },

  //---------------------------------------------------------------------------

  sort: {

    random  : function (a,b) { return Math.random() - 0.5; },
    w       : function (a,b) { return b.w - a.w; },
    h       : function (a,b) { return b.h - a.h; },
    a       : function (a,b) { return b.area - a.area; },
    max     : function (a,b) { return Math.max(b.w, b.h) - Math.max(a.w, a.h); },
    min     : function (a,b) { return Math.min(b.w, b.h) - Math.min(a.w, a.h); },

    height  : function (a,b) { return Demo.sort.msort(a, b, ['h', 'w']);               },
    width   : function (a,b) { return Demo.sort.msort(a, b, ['w', 'h']);               },
    area    : function (a,b) { return Demo.sort.msort(a, b, ['a', 'h', 'w']);          },
    maxside : function (a,b) { return Demo.sort.msort(a, b, ['max', 'min', 'h', 'w']); },

    msort: function(a, b, criteria) { /* sort by multiple criteria */
      var diff, n;
      for (n = 0 ; n < criteria.length ; n++) {
        diff = Demo.sort[criteria[n]](a,b);
        if (diff != 0)
          return diff;  
      }
      return 0;
    },

    now: function(blocks) {
      var sort = Demo.el.sort.val();
      if (sort != 'none')
        blocks.sort(Demo.sort[sort]);
    }
  },

  //---------------------------------------------------------------------------

  canvas: {

    reset: function(width, height) {
      let zoom = parseInt(Demo.el.zoom.val());

      Demo.el.canvas.width  = width * zoom  + 1; // add 1 because we draw boundaries offset by 0.5 in order to pixel align and get crisp boundaries
      Demo.el.canvas.height = height * zoom + 1; // (ditto)
      Demo.el.draw.clearRect(0, 0, Demo.el.canvas.width * zoom, Demo.el.canvas.height * zoom);
    },

    rect:  function(x, y, w, h, color, name, rate, zoom) {
      let label = Demo.el.label.val();
      let label_mode = 1;
      switch(label){
        case "Name+Size":
          label_mode = 1;
          break;
        case "None":
          label_mode = 0;
          break;

      }

      Demo.el.draw.fillStyle = color;
      Demo.el.draw.fillRect(x * zoom + 0.5, y * zoom + 0.5, w * zoom, h * zoom);

      let img = new Image();
      img.src = './img/'+name+'.jpg';
      img.onload = function(){
        Demo.el.draw.drawImage(img,x * zoom + 0.5, y * zoom + 0.5, w * zoom, h * zoom);

        if (label_mode == 1){
          Demo.el.draw.fillStyle = 'rgba(255, 255, 255, 0.7)';
          Demo.el.draw.fillRect(x * zoom + 0.5, y * zoom + 0.5, 80, 28);
          Demo.el.draw.fillStyle = 'rgba(0, 0, 0)';
          Demo.el.draw.fillText(name+" - "+Math.round(rate*100)/100.0, x * zoom+2, y * zoom+12);
          Demo.el.draw.fillText(w+"x"+h, x * zoom+2, y * zoom+24);
        }
      }
      img.onerror = function(){
        if (label_mode == 1){
          Demo.el.draw.fillStyle = 'rgba(255, 255, 255, 0.7)';
          Demo.el.draw.fillRect(x * zoom + 0.5, y * zoom + 0.5, 80, 28);
          Demo.el.draw.fillStyle = 'rgba(0, 0, 0)';
          Demo.el.draw.fillText(name+" - "+Math.round(rate*100)/100.0, x * zoom+2, y * zoom+12);
          Demo.el.draw.fillText(w+"x"+h, x * zoom+2, y * zoom+24);
        }
      }
    },

    stroke: function(x, y, w, h, zoom) {
      Demo.el.draw.strokeRect(x * zoom + 0.5, y * zoom + 0.5, w * zoom, h * zoom);
    },

    blocks: function(blocks) {
      var n, block;
      let zoom = parseInt(Demo.el.zoom.val());
      for (n = 0 ; n < blocks.length ; n++) {
        block = blocks[n];
        Demo.canvas.rect(block.x - block.width/2, block.y - block.height/2, block.width, block.height, Demo.color(n), block.getProperty("name"), block.getProperty("rate"), zoom);
      }
    },
  },

  //---------------------------------------------------------------------------

  blocks: {

    examples: {

      sample: [
        { name:"Poster1", w: 50, h: 20, r_min:  0.8 , r_max: 1.2},
        { name:"Poster2", w: 40, h: 20, r_min:  0.8 , r_max: 1.2},
        { name:"Poster3", w: 30, h: 20, r_min:  [0.8,1.2] , r_max: null},
        { name:"Note1", w: 20, h: 20, r_min:  0.8 , r_max: 1.2},
      ],

      current: function() {
        return Demo.blocks.examples[Demo.el.examples.val()];
      },

      change: function() {
        Demo.el.blocks.val(Demo.blocks.serialize(Demo.blocks.examples.current()));
        Demo.run();
      }
    },

    deserialize: function(val, cw, ch) {
      var i, j, block, size, rate, type, blocks = val.split("\n"), result = [];
      for(i = 0 ; i < blocks.length ; i++) {
        block = blocks[i].split(",");
        if (block.length == 3){
          size = block[1].split("x");
          rate = block[2].split("-");
          type = 0;
          if (rate.length != 2){
            rate = block[2].split("/");
            result.push({name: block[0], w: parseInt(size[0]), h: parseInt(size[1]), r_min: rate, r_max: null});
          }else{
            result.push({name: block[0], w: parseInt(size[0]), h: parseInt(size[1]), r_min: parseFloat(rate[0]), r_max: parseFloat(rate[1])});
          }
        }
      }
      console.log(result);
      var expanded = [];
      for(i = 0 ; i < result.length ; i++) {
        let r;
        if (result[i].r_max == null){
          var num = result[i].r_min.length;
          r = parseFloat(result[i].r_min[Math.floor(Math.random()*num)]);
        }else{
          r = Math.random() * (result[i].r_max - result[i].r_min) + result[i].r_min;
        }
        //r = Math.round(r*100)/100.0;
        console.log(r);
        let rw = Math.round(result[i].w * r * 100)/100.0;
        let rh = Math.round(result[i].h * r * 100)/100.0;
        let new_rect = new binpacking.Rect(
          cw/2,
          ch/2,
          rw,
          rh);

        new_rect.addProperty("name", result[i].name);
        new_rect.addProperty("rate", r);
        expanded.push(new_rect);
      }
      console.log(expanded);
      return expanded;
    },

    serialize: function(blocks) {
      var i, block, str = "";
      for(i = 0; i < blocks.length ; i++) {
        block = blocks[i];
        if (block.r_max == null){
          str = str + block.name + ',' + block.w + "x" + block.h + ",";
          for (var j in block.r_min){
            str = str + block.r_min[j] + "/";
          }
          str = str.slice(0,-1) + "\n";
        }
        else{
          str = str + block.name + ',' + block.w + "x" + block.h + "," + block.r_min + "-" + block.r_max + "\n";
        }
      }
      return str;
    }

  },

  //---------------------------------------------------------------------------

  colors: {
    pastel:         [ "#FFF7A5", "#FFA5E0", "#A5B3FF", "#BFFFA5", "#FFCBA5" ],
    basic:          [ "silver", "gray", "red", "maroon", "yellow", "olive", "lime", "green", "aqua", "teal", "blue", "navy", "fuchsia", "purple" ],
    gray:           [ "#111", "#222", "#333", "#444", "#555", "#666", "#777", "#888", "#999", "#AAA", "#BBB", "#CCC", "#DDD", "#EEE" ],
    vintage:        [ "#EFD279", "#95CBE9", "#024769", "#AFD775", "#2C5700", "#DE9D7F", "#7F9DDE", "#00572C", "#75D7AF", "#694702", "#E9CB95", "#79D2EF" ],
    solarized:      [ "#b58900", "#cb4b16", "#dc322f", "#d33682", "#6c71c4", "#268bd2", "#2aa198", "#859900" ],
    none:           [ "transparent" ]
  },

  color: function(n) {
    var cols = Demo.colors[Demo.el.color.val()];
    return cols[n % cols.length];
  }

  //---------------------------------------------------------------------------

}

$(Demo.init);

