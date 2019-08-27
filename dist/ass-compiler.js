(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (factory((global.assCompiler = {})));
}(this, (function (exports) { 'use strict';

  function parseEffect(text) {
    var param = text
      .toLowerCase()
      .trim()
      .split(/\s*;\s*/);
    if (param[0] === 'banner') {
      return {
        name: param[0],
        delay: param[1] * 1 || 0,
        leftToRight: param[2] * 1 || 0,
        fadeAwayWidth: param[3] * 1 || 0,
      };
    }
    if (/^scroll\s/.test(param[0])) {
      return {
        name: param[0],
        y1: Math.min(param[1] * 1, param[2] * 1),
        y2: Math.max(param[1] * 1, param[2] * 1),
        delay: param[3] * 1 || 0,
        fadeAwayHeight: param[4] * 1 || 0,
      };
    }
    return null;
  }

  function parseDrawing(text) {
    return text
      .toLowerCase()
      // numbers
      .replace(/([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)/g, ' $1 ')
      // commands
      .replace(/([mnlbspc])/g, ' $1 ')
      .trim()
      .replace(/\s+/g, ' ')
      .split(/\s(?=[mnlbspc])/)
      .map(function (cmd) { return (
        cmd.split(' ')
          .filter(function (x, i) { return !(i && isNaN(x * 1)); })
      ); });
  }

  var numTags = [
    'b', 'i', 'u', 's', 'fsp',
    'k', 'K', 'kf', 'ko', 'kt',
    'fe', 'q', 'p', 'pbo', 'a', 'an',
    'fscx', 'fscy', 'fax', 'fay', 'frx', 'fry', 'frz', 'fr',
    'be', 'blur', 'bord', 'xbord', 'ybord', 'shad', 'xshad', 'yshad' ];

  var numRegexs = numTags.map(function (nt) { return ({ name: nt, regex: new RegExp(("^" + nt + "-?\\d")) }); });

  function parseTag(text) {
    var assign;

    var tag = {};
    for (var i = 0; i < numRegexs.length; i++) {
      var ref = numRegexs[i];
      var name = ref.name;
      var regex = ref.regex;
      if (regex.test(text)) {
        tag[name] = text.slice(name.length) * 1;
        return tag;
      }
    }
    if (/^fn/.test(text)) {
      tag.fn = text.slice(2);
    } else if (/^r/.test(text)) {
      tag.r = text.slice(1);
    } else if (/^fs[\d+-]/.test(text)) {
      tag.fs = text.slice(2);
    } else if (/^\d?c&?H?[0-9a-f]+|^\d?c$/i.test(text)) {
      var ref$1 = text.match(/^(\d?)c&?H?(\w*)/);
      var num = ref$1[1];
      var color = ref$1[2];
      tag[("c" + (num || 1))] = color && ("000000" + color).slice(-6);
    } else if (/^\da&?H?[0-9a-f]+/i.test(text)) {
      var ref$2 = text.match(/^(\d)a&?H?(\w\w)/);
      var num$1 = ref$2[1];
      var alpha = ref$2[2];
      tag[("a" + num$1)] = alpha;
    } else if (/^alpha&?H?[0-9a-f]+/i.test(text)) {
      (assign = text.match(/^alpha&?H?([0-9a-f]+)/i), tag.alpha = assign[1]);
      tag.alpha = ("00" + (tag.alpha)).slice(-2);
    } else if (/^(?:pos|org|move|fad|fade)\(/.test(text)) {
      var ref$3 = text.match(/^(\w+)\((.*?)\)?$/);
      var key = ref$3[1];
      var value = ref$3[2];
      tag[key] = value
        .trim()
        .split(/\s*,\s*/)
        .map(Number);
    } else if (/^i?clip/.test(text)) {
      var p = text
        .match(/^i?clip\((.*?)\)?$/)[1]
        .trim()
        .split(/\s*,\s*/);
      tag.clip = {
        inverse: /iclip/.test(text),
        scale: 1,
        drawing: null,
        dots: null,
      };
      if (p.length === 1) {
        tag.clip.drawing = parseDrawing(p[0]);
      }
      if (p.length === 2) {
        tag.clip.scale = p[0] * 1;
        tag.clip.drawing = parseDrawing(p[1]);
      }
      if (p.length === 4) {
        tag.clip.dots = p.map(Number);
      }
    } else if (/^t\(/.test(text)) {
      var p$1 = text
        .match(/^t\((.*?)\)?$/)[1]
        .trim()
        .replace(/\\.*/, function (x) { return x.replace(/,/g, '\n'); })
        .split(/\s*,\s*/);
      if (!p$1[0]) { return tag; }
      tag.t = {
        t1: 0,
        t2: 0,
        accel: 1,
        tags: p$1[p$1.length - 1]
          .replace(/\n/g, ',')
          .split('\\')
          .slice(1)
          .map(parseTag),
      };
      if (p$1.length === 2) {
        tag.t.accel = p$1[0] * 1;
      }
      if (p$1.length === 3) {
        tag.t.t1 = p$1[0] * 1;
        tag.t.t2 = p$1[1] * 1;
      }
      if (p$1.length === 4) {
        tag.t.t1 = p$1[0] * 1;
        tag.t.t2 = p$1[1] * 1;
        tag.t.accel = p$1[2] * 1;
      }
    }

    return tag;
  }

  function parseTags(text) {
    var tags = [];
    var depth = 0;
    var str = '';
    for (var i = 0; i < text.length; i++) {
      var x = text[i];
      if (x === '(') { depth++; }
      if (x === ')') { depth--; }
      if (depth < 0) { depth = 0; }
      if (!depth && x === '\\') {
        if (str) {
          tags.push(str);
        }
        str = '';
      } else {
        str += x;
      }
    }
    tags.push(str);
    return tags.map(parseTag);
  }

  function parseText(text) {
    var pairs = text.split(/{([^{}]*?)}/);
    var parsed = [];
    if (pairs[0].length) {
      parsed.push({ tags: [], text: pairs[0], drawing: [] });
    }
    for (var i = 1; i < pairs.length; i += 2) {
      var tags = parseTags(pairs[i]);
      var isDrawing = tags.reduce(function (v, tag) { return (tag.p === undefined ? v : !!tag.p); }, false);
      parsed.push({
        tags: tags,
        text: isDrawing ? '' : pairs[i + 1],
        drawing: isDrawing ? parseDrawing(pairs[i + 1]) : [],
      });
    }
    return {
      raw: text,
      combined: parsed.map(function (frag) { return frag.text; }).join(''),
      parsed: parsed,
    };
  }

  function parseTime(time) {
    var t = time.split(':');
    return t[0] * 3600 + t[1] * 60 + t[2] * 1;
  }

  function parseDialogue(text, format) {
    var fields = text.split(',');
    if (fields.length > format.length) {
      var textField = fields.slice(format.length - 1).join();
      fields = fields.slice(0, format.length - 1);
      fields.push(textField);
    }

    var dia = {};
    for (var i = 0; i < fields.length; i++) {
      var fmt = format[i];
      var fld = fields[i].trim();
      switch (fmt) {
        case 'Layer':
        case 'MarginL':
        case 'MarginR':
        case 'MarginV':
          dia[fmt] = fld * 1;
          break;
        case 'Start':
        case 'End':
          dia[fmt] = parseTime(fld);
          break;
        case 'Effect':
          dia[fmt] = parseEffect(fld);
          break;
        case 'Text':
          dia[fmt] = parseText(fld);
          break;
        default:
          dia[fmt] = fld;
      }
    }

    return dia;
  }

  function parseFormat(text) {
    return text.match(/Format\s*:\s*(.*)/i)[1].split(/\s*,\s*/);
  }

  function parseStyle(text) {
    return text.match(/Style\s*:\s*(.*)/i)[1].split(/\s*,\s*/);
  }

  function parse(text) {
    var tree = {
      info: {},
      styles: { format: [], style: [] },
      events: { format: [], comment: [], dialogue: [] },
    };
    var lines = text.split(/\r?\n/);
    var state = 0;
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (/^;/.test(line)) { continue; }

      if (/^\[Script Info\]/i.test(line)) { state = 1; }
      else if (/^\[V4\+? Styles\]/i.test(line)) { state = 2; }
      else if (/^\[Events\]/i.test(line)) { state = 3; }
      else if (/^\[.*\]/.test(line)) { state = 0; }

      if (state === 0) { continue; }
      if (state === 1) {
        if (/:/.test(line)) {
          var ref = line.match(/(.*?)\s*:\s*(.*)/);
          var key = ref[1];
          var value = ref[2];
          tree.info[key] = value;
        }
      }
      if (state === 2) {
        if (/^Format\s*:/i.test(line)) {
          tree.styles.format = parseFormat(line);
        }
        if (/^Style\s*:/i.test(line)) {
          tree.styles.style.push(parseStyle(line));
        }
      }
      if (state === 3) {
        if (/^Format\s*:/i.test(line)) {
          tree.events.format = parseFormat(line);
        }
        if (/^(?:Comment|Dialogue)\s*:/i.test(line)) {
          var ref$1 = line.match(/^(\w+?)\s*:\s*(.*)/i);
          var key$1 = ref$1[1];
          var value$1 = ref$1[2];
          tree.events[key$1.toLowerCase()].push(parseDialogue(value$1, tree.events.format));
        }
      }
    }

    return tree;
  }

  var assign = Object.assign || (
    /* istanbul ignore next */
    function assign(target) {
      var sources = [], len = arguments.length - 1;
      while ( len-- > 0 ) sources[ len ] = arguments[ len + 1 ];

      for (var i = 0; i < sources.length; i++) {
        if (!sources[i]) { continue; }
        var keys = Object.keys(sources[i]);
        for (var j = 0; j < keys.length; j++) {
          // eslint-disable-next-line no-param-reassign
          target[keys[j]] = sources[i][keys[j]];
        }
      }
      return target;
    }
  );

  function createCommand(arr) {
    var cmd = {
      type: null,
      prev: null,
      next: null,
      points: [],
    };
    if (/[mnlbs]/.test(arr[0])) {
      cmd.type = arr[0]
        .toUpperCase()
        .replace('N', 'L')
        .replace('B', 'C');
    }
    for (var len = arr.length - !(arr.length & 1), i = 1; i < len; i += 2) {
      cmd.points.push({ x: arr[i] * 1, y: arr[i + 1] * 1 });
    }
    return cmd;
  }

  function isValid(cmd) {
    if (!cmd.points.length || !cmd.type) {
      return false;
    }
    if (/C|S/.test(cmd.type) && cmd.points.length < 3) {
      return false;
    }
    return true;
  }

  function getViewBox(commands) {
    var ref;

    var minX = Infinity;
    var minY = Infinity;
    var maxX = -Infinity;
    var maxY = -Infinity;
    (ref = []).concat.apply(ref, commands.map(function (ref) {
      var points = ref.points;

      return points;
    })).forEach(function (ref) {
      var x = ref.x;
      var y = ref.y;

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    });
    return {
      minX: minX,
      minY: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  /**
   * Convert S command to B command
   * Reference from https://github.com/d3/d3/blob/v3.5.17/src/svg/line.js#L259
   * @param  {Array}  points points
   * @param  {String} prev   type of previous command
   * @param  {String} next   type of next command
   * @return {Array}         converted commands
   */
  function s2b(points, prev, next) {
    var results = [];
    var bb1 = [0, 2 / 3, 1 / 3, 0];
    var bb2 = [0, 1 / 3, 2 / 3, 0];
    var bb3 = [0, 1 / 6, 2 / 3, 1 / 6];
    var dot4 = function (a, b) { return (a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]); };
    var px = [points[points.length - 1].x, points[0].x, points[1].x, points[2].x];
    var py = [points[points.length - 1].y, points[0].y, points[1].y, points[2].y];
    results.push({
      type: prev === 'M' ? 'M' : 'L',
      points: [{ x: dot4(bb3, px), y: dot4(bb3, py) }],
    });
    for (var i = 3; i < points.length; i++) {
      px = [points[i - 3].x, points[i - 2].x, points[i - 1].x, points[i].x];
      py = [points[i - 3].y, points[i - 2].y, points[i - 1].y, points[i].y];
      results.push({
        type: 'C',
        points: [
          { x: dot4(bb1, px), y: dot4(bb1, py) },
          { x: dot4(bb2, px), y: dot4(bb2, py) },
          { x: dot4(bb3, px), y: dot4(bb3, py) } ],
      });
    }
    if (next === 'L' || next === 'C') {
      var last = points[points.length - 1];
      results.push({ type: 'L', points: [{ x: last.x, y: last.y }] });
    }
    return results;
  }

  function toSVGPath(instructions) {
    return instructions.map(function (ref) {
      var type = ref.type;
      var points = ref.points;

      return (
      type + points.map(function (ref) {
        var x = ref.x;
        var y = ref.y;

        return (x + "," + y);
      }).join(',')
    );
    }).join('');
  }

  function compileDrawing(rawCommands) {
    var ref$1;

    var commands = [];
    var i = 0;
    while (i < rawCommands.length) {
      var arr = rawCommands[i];
      var cmd = createCommand(arr);
      if (isValid(cmd)) {
        if (cmd.type === 'S') {
          var ref = (commands[i - 1] || { points: [{ x: 0, y: 0 }] }).points.slice(-1)[0];
          var x = ref.x;
          var y = ref.y;
          cmd.points.unshift({ x: x, y: y });
        }
        if (i) {
          cmd.prev = commands[i - 1].type;
          commands[i - 1].next = cmd.type;
        }
        commands.push(cmd);
        i++;
      } else {
        if (i && commands[i - 1].type === 'S') {
          var additionPoints = {
            p: cmd.points,
            c: commands[i - 1].points.slice(0, 3),
          };
          commands[i - 1].points = commands[i - 1].points.concat(
            (additionPoints[arr[0]] || []).map(function (ref) {
              var x = ref.x;
              var y = ref.y;

              return ({ x: x, y: y });
          })
          );
        }
        rawCommands.splice(i, 1);
      }
    }
    var instructions = (ref$1 = []).concat.apply(
      ref$1, commands.map(function (ref) {
        var type = ref.type;
        var points = ref.points;
        var prev = ref.prev;
        var next = ref.next;

        return (
        type === 'S'
          ? s2b(points, prev, next)
          : { type: type, points: points }
      );
    })
    );

    return assign({ instructions: instructions, d: toSVGPath(instructions) }, getViewBox(commands));
  }

  var tTags = [
    'fs', 'clip',
    'c1', 'c2', 'c3', 'c4', 'a1', 'a2', 'a3', 'a4', 'alpha',
    'fscx', 'fscy', 'fax', 'fay', 'frx', 'fry', 'frz', 'fr',
    'be', 'blur', 'bord', 'xbord', 'ybord', 'shad', 'xshad', 'yshad' ];

  function compileTag(tag, key, presets) {
    var obj, obj$1, obj$2;

    if ( presets === void 0 ) presets = {};
    var value = tag[key];
    if (value === undefined) {
      return null;
    }
    if (key === 'pos' || key === 'org') {
      return value.length === 2 ? ( obj = {}, obj[key] = { x: value[0], y: value[1] }, obj ) : null;
    }
    if (key === 'move') {
      var x1 = value[0];
      var y1 = value[1];
      var x2 = value[2];
      var y2 = value[3];
      var t1 = value[4]; if ( t1 === void 0 ) t1 = 0;
      var t2 = value[5]; if ( t2 === void 0 ) t2 = 0;
      return value.length === 4 || value.length === 6
        ? { move: { x1: x1, y1: y1, x2: x2, y2: y2, t1: t1, t2: t2 } }
        : null;
    }
    if (key === 'fad' || key === 'fade') {
      if (value.length === 2) {
        var t1$1 = value[0];
        var t2$1 = value[1];
        return { fade: { type: 'fad', t1: t1$1, t2: t2$1 } };
      }
      if (value.length === 7) {
        var a1 = value[0];
        var a2 = value[1];
        var a3 = value[2];
        var t1$2 = value[3];
        var t2$2 = value[4];
        var t3 = value[5];
        var t4 = value[6];
        return { fade: { type: 'fade', a1: a1, a2: a2, a3: a3, t1: t1$2, t2: t2$2, t3: t3, t4: t4 } };
      }
      return null;
    }
    if (key === 'clip') {
      var inverse = value.inverse;
      var scale = value.scale;
      var drawing = value.drawing;
      var dots = value.dots;
      if (drawing) {
        return { clip: { inverse: inverse, scale: scale, drawing: compileDrawing(drawing), dots: dots } };
      }
      if (dots) {
        var x1$1 = dots[0];
        var y1$1 = dots[1];
        var x2$1 = dots[2];
        var y2$1 = dots[3];
        return { clip: { inverse: inverse, scale: scale, drawing: drawing, dots: { x1: x1$1, y1: y1$1, x2: x2$1, y2: y2$1 } } };
      }
      return null;
    }
    if (/^[xy]?(bord|shad)$/.test(key)) {
      value = Math.max(value, 0);
    }
    if (key === 'bord') {
      return { xbord: value, ybord: value };
    }
    if (key === 'shad') {
      return { xshad: value, yshad: value };
    }
    if (/^c\d$/.test(key)) {
      return ( obj$1 = {}, obj$1[key] = value || presets[key], obj$1 );
    }
    if (key === 'alpha') {
      return { a1: value, a2: value, a3: value, a4: value };
    }
    if (key === 'fr') {
      return { frz: value };
    }
    if (key === 'fs') {
      return {
        fs: /^\+|-/.test(value)
          ? (value * 1 > -10 ? (1 + value / 10) : 1) * presets.fs
          : value * 1,
      };
    }
    if (key === 't') {
      var t1$3 = value.t1;
      var accel = value.accel;
      var tags = value.tags;
      var t2$3 = value.t2 || (presets.end - presets.start) * 1e3;
      var compiledTag = {};
      tags.forEach(function (t) {
        var k = Object.keys(t)[0];
        if (~tTags.indexOf(k) && !(k === 'clip' && !t[k].dots)) {
          assign(compiledTag, compileTag(t, k, presets));
        }
      });
      return { t: { t1: t1$3, t2: t2$3, accel: accel, tag: compiledTag } };
    }
    return ( obj$2 = {}, obj$2[key] = value, obj$2 );
  }

  var a2an = [
    null, 1, 2, 3,
    null, 7, 8, 9,
    null, 4, 5, 6 ];

  var globalTags = ['r', 'a', 'an', 'pos', 'org', 'move', 'fade', 'fad', 'clip'];

  function createSlice(name, styles) {
    return {
      name: name,
      borderStyle: styles[name].style.BorderStyle,
      tag: styles[name].tag,
      fragments: [],
    };
  }

  function compileText(ref) {
    var styles = ref.styles;
    var name = ref.name;
    var parsed = ref.parsed;
    var start = ref.start;
    var end = ref.end;

    var alignment;
    var pos;
    var org;
    var move;
    var fade;
    var clip;
    var slices = [];
    var slice = createSlice(name, styles);
    var prevTag = {};
    for (var i = 0; i < parsed.length; i++) {
      var ref$1 = parsed[i];
      var tags = ref$1.tags;
      var text = ref$1.text;
      var drawing = ref$1.drawing;
      var reset = (void 0);
      for (var j = 0; j < tags.length; j++) {
        var tag = tags[j];
        reset = tag.r === undefined ? reset : tag.r;
      }
      var fragment = {
        tag: reset === undefined ? JSON.parse(JSON.stringify(prevTag)) : {},
        text: text,
        drawing: drawing.length ? compileDrawing(drawing) : null,
      };
      for (var j$1 = 0; j$1 < tags.length; j$1++) {
        var tag$1 = tags[j$1];
        alignment = alignment || a2an[tag$1.a || 0] || tag$1.an;
        pos = pos || compileTag(tag$1, 'pos');
        org = org || compileTag(tag$1, 'org');
        move = move || compileTag(tag$1, 'move');
        fade = fade || compileTag(tag$1, 'fade') || compileTag(tag$1, 'fad');
        clip = compileTag(tag$1, 'clip') || clip;
        var key = Object.keys(tag$1)[0];
        if (key && !~globalTags.indexOf(key)) {
          var ref$2 = slice.tag;
          var c1 = ref$2.c1;
          var c2 = ref$2.c2;
          var c3 = ref$2.c3;
          var c4 = ref$2.c4;
          var fs = prevTag.fs || slice.tag.fs;
          var compiledTag = compileTag(tag$1, key, { start: start, end: end, c1: c1, c2: c2, c3: c3, c4: c4, fs: fs });
          if (key === 't') {
            fragment.tag.t = fragment.tag.t || [];
            fragment.tag.t.push(compiledTag.t);
          } else {
            assign(fragment.tag, compiledTag);
          }
        }
      }
      prevTag = fragment.tag;
      if (reset !== undefined) {
        slices.push(slice);
        slice = createSlice(styles[reset] ? reset : name, styles);
      }
      if (fragment.text || fragment.drawing) {
        var prev = slice.fragments[slice.fragments.length - 1] || {};
        if (prev.text && fragment.text && !Object.keys(fragment.tag).length) {
          // merge fragment to previous if its tag is empty
          prev.text += fragment.text;
        } else {
          slice.fragments.push(fragment);
        }
      }
    }
    slices.push(slice);

    return assign({ alignment: alignment, slices: slices }, pos, org, move, fade, clip);
  }

  function compileDialogues(ref) {
    var styles = ref.styles;
    var dialogues = ref.dialogues;

    var minLayer = Infinity;
    var results = [];
    for (var i = 0; i < dialogues.length; i++) {
      var dia = dialogues[i];
      if (dia.Start >= dia.End) {
        continue;
      }
      if (!styles[dia.Style]) {
        dia.Style = 'Default';
      }
      var stl = styles[dia.Style].style;
      var compiledText = compileText({
        styles: styles,
        name: dia.Style,
        parsed: dia.Text.parsed,
        start: dia.Start,
        end: dia.End,
      });
      var alignment = compiledText.alignment || stl.Alignment;
      minLayer = Math.min(minLayer, dia.Layer);
      results.push(assign({
        layer: dia.Layer,
        start: dia.Start,
        end: dia.End,
        // reset style by `\r` will not effect margin and alignment
        margin: {
          left: dia.MarginL || stl.MarginL,
          right: dia.MarginR || stl.MarginR,
          vertical: dia.MarginV || stl.MarginV,
        },
        effect: dia.Effect,
      }, compiledText, { alignment: alignment }));
    }
    for (var i$1 = 0; i$1 < results.length; i$1++) {
      results[i$1].layer -= minLayer;
    }
    return results.sort(function (a, b) { return a.start - b.start || a.end - b.end; });
  }

  // same as Aegisub
  // https://github.com/Aegisub/Aegisub/blob/master/src/ass_style.h
  var DEFAULT_STYLE = {
    Name: 'Default',
    Fontname: 'Arial',
    Fontsize: '20',
    PrimaryColour: '&H00FFFFFF&',
    SecondaryColour: '&H000000FF&',
    OutlineColour: '&H00000000&',
    BackColour: '&H00000000&',
    Bold: '0',
    Italic: '0',
    Underline: '0',
    StrikeOut: '0',
    ScaleX: '100',
    ScaleY: '100',
    Spacing: '0',
    Angle: '0',
    BorderStyle: '1',
    Outline: '2',
    Shadow: '2',
    Alignment: '2',
    MarginL: '10',
    MarginR: '10',
    MarginV: '10',
    Encoding: '1',
  };

  /**
   * @param {String} color
   * @returns {Array} [AA, BBGGRR]
   */
  function parseStyleColor(color) {
    if (/^(&|H|&H)[0-9a-f]{6,}/i.test(color)) {
      var ref = color.match(/&?H?([0-9a-f]{2})?([0-9a-f]{6})/i);
      var a = ref[1];
      var c = ref[2];
      return [a || '00', c];
    }
    var num = parseInt(color, 10);
    if (!isNaN(num)) {
      var min = -2147483648;
      var max = 2147483647;
      if (num < min) {
        return ['00', '000000'];
      }
      var aabbggrr = (min <= num && num <= max)
        ? ("00000000" + ((num < 0 ? num + 4294967296 : num).toString(16))).slice(-8)
        : String(num).slice(0, 8);
      return [aabbggrr.slice(0, 2), aabbggrr.slice(2)];
    }
    return ['00', '000000'];
  }

  function compileStyles(ref) {
    var info = ref.info;
    var style = ref.style;
    var format = ref.format;
    var defaultStyle = ref.defaultStyle;

    var result = {};
    var styles = [
      assign({}, DEFAULT_STYLE, defaultStyle, { Name: 'Default' }) ].concat( style.map(function (stl) {
        var s = {};
        for (var i = 0; i < format.length; i++) {
          s[format[i]] = stl[i];
        }
        return s;
      }) );
    var loop = function ( i ) {
      var s = styles[i];
      // this behavior is same as Aegisub by black-box testing
      if (/^(\*+)Default$/.test(s.Name)) {
        s.Name = 'Default';
      }
      Object.keys(s).forEach(function (key) {
        if (key !== 'Name' && key !== 'Fontname' && !/Colour/.test(key)) {
          s[key] *= 1;
        }
      });
      var ref$1 = parseStyleColor(s.PrimaryColour);
      var a1 = ref$1[0];
      var c1 = ref$1[1];
      var ref$2 = parseStyleColor(s.SecondaryColour);
      var a2 = ref$2[0];
      var c2 = ref$2[1];
      var ref$3 = parseStyleColor(s.OutlineColour);
      var a3 = ref$3[0];
      var c3 = ref$3[1];
      var ref$4 = parseStyleColor(s.BackColour);
      var a4 = ref$4[0];
      var c4 = ref$4[1];
      var tag = {
        fn: s.Fontname,
        fs: s.Fontsize,
        c1: c1,
        a1: a1,
        c2: c2,
        a2: a2,
        c3: c3,
        a3: a3,
        c4: c4,
        a4: a4,
        b: Math.abs(s.Bold),
        i: Math.abs(s.Italic),
        u: Math.abs(s.Underline),
        s: Math.abs(s.StrikeOut),
        fscx: s.ScaleX,
        fscy: s.ScaleY,
        fsp: s.Spacing,
        frz: s.Angle,
        xbord: s.Outline,
        ybord: s.Outline,
        xshad: s.Shadow,
        yshad: s.Shadow,
        q: /^[0-3]$/.test(info.WrapStyle) ? info.WrapStyle * 1 : 2,
      };
      result[s.Name] = { style: s, tag: tag };
    };

    for (var i = 0; i < styles.length; i++) loop( i );
    return result;
  }

  function compile(text, options) {
    if ( options === void 0 ) options = {};

    var tree = parse(text);
    var styles = compileStyles({
      info: tree.info,
      style: tree.styles.style,
      format: tree.styles.format,
      defaultStyle: options.defaultStyle || {},
    });
    return {
      info: tree.info,
      width: tree.info.PlayResX * 1 || null,
      height: tree.info.PlayResY * 1 || null,
      collisions: tree.info.Collisions || 'Normal',
      styles: styles,
      dialogues: compileDialogues({
        styles: styles,
        dialogues: tree.events.dialogue,
      }),
    };
  }

  var AssStream = function AssStream() {
    this.info = {};
    this.styleFormat = [];
    this.parsedStyle = [];
    this.eventFormat = [];
    this.newParsedComments = [];
    this.newParsedDialogues = [];

    this.parsingState = 0;

    this.compiledStyles = {};
    this.compiledDialogues = [];
  };

  var prototypeAccessors = { compiled: { configurable: true } };

  AssStream.getParsingState = function getParsingState (line) {
    if (/^\[Script Info\]/i.test(line)) { return 1; }
    if (/^\[V4\+? Styles\]/i.test(line)) { return 2; }
    if (/^\[Events\]/i.test(line)) { return 3; }
    if (/^\[.*\]/.test(line)) { return 0; }
    return -1;
  };

  AssStream.prototype.parse = function parse (text) {
    var lines = text.split(/\r?\n/);

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (/^;/.test(line)) { continue; }

      var lineParsingState = AssStream.getParsingState(line);
      if (lineParsingState === 0) { continue; }
      else if (lineParsingState === -1) { lineParsingState = this.parsingState; }
      else { this.parsingState = lineParsingState; }

      switch (lineParsingState) {
        default:
          continue;
        case 1: {
          if (/:/.test(line)) {
            var ref = line.match(/(.*?)\s*:\s*(.*)/);
              var key = ref[1];
              var value = ref[2];
            this.info[key] = value;
          }
          break;
        }
        case 2: {
          if (/^Format\s*:/i.test(line)) {
            this.styleFormat = parseFormat(line);
          }
          if (/^Style\s*:/i.test(line)) {
            this.parsedStyle.push(parseStyle(line));
          }
          break;
        }
        case 3: {
          if (/^Format\s*:/i.test(line)) {
            this.eventFormat = parseFormat(line);
          }
          if (/^(?:Comment|Dialogue)\s*:/i.test(line)) {
            var ref$1 = line.match(/^(\w+?)\s*:\s*(.*)/i);
              var key$1 = ref$1[1];
              var value$1 = ref$1[2];
            var eventType = key$1.toLowerCase();
            var eventValue = parseDialogue(value$1, this.eventFormat);
            if (eventType === 'comment') { this.newParsedComments.push(eventValue); }
            if (eventType === 'dialogue') { this.newParsedDialogues.push(eventValue); }
          }
          break;
        }
      }
    }
  };

  AssStream.prototype.compile = function compile (text) {
      var ref;

    this.parse(text);

    this.compiledStyles = compileStyles({
      info: this.info,
      style: this.parsedStyle,
      format: this.styleFormat,
      defaultStyle: {},
    });

    (ref = this.compiledDialogues).push.apply(ref, compileDialogues({
      styles: this.compiledStyles,
      dialogues: this.newParsedDialogues,
    }));
    var result = [].concat( this.newParsedDialogues );
    this.newParsedDialogues = [];

    return result;
  };

  prototypeAccessors.compiled.get = function () {
    return {
      info: this.info,
      width: this.info.PlayResX * 1 || null,
      height: this.info.PlayResY * 1 || null,
      collisions: this.info.Collisions || 'Normal',
      styles: this.compiledStyles,
      dialogues: this.compiledDialogues,
    };
  };

  Object.defineProperties( AssStream.prototype, prototypeAccessors );

  exports.parse = parse;
  exports.compile = compile;
  exports.AssStream = AssStream;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
