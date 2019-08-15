import { parseFormat } from './parser/format';
import { parseStyle } from './parser/style';
import { parseDialogue } from './parser/dialogue';
import { compileStyles } from './compiler/styles';
import { compileDialogues } from './compiler/dialogues';

export class TimeSegments {
  constructor() {
    this.startTimestamps = [];
    this.endTimestamps = [];
  }

  insert(start, end) {
    const [startTime, endTime] = [start, end].sort();
    const { in: startIn, index: startIndex } = this.checkWithIndex(startTime);
    const { in: endIn, index: endIndex } = this.checkWithIndex(endTime);

    if (!startIn && !endIn && startIndex === endIndex) {
      this.startTimestamps.splice(startIndex + 1, 0, startTime);
      this.endTimestamps.splice(endIndex + 1, 0, endTime);
    } else {
      if (!startIn) this.startTimestamps[startIndex + 1] = startTime;
      this.endTimestamps[startIn ? startIndex : endIndex] = endIn
        ? this.endTimestamps[endIndex] : end;

      const deleteIndex = startIndex === endIndex ? 0 : startIndex + 1;
      const deleteCount = endIndex - startIndex - (startIn ? 0 : 1);
      this.startTimestamps.splice(deleteIndex, deleteCount);
      this.endTimestamps.splice(deleteIndex, deleteCount);
    }
  }

  checkWithIndex(time) {
    const index = this.startTimestamps.findIndex((startTime, ind, times) => {
      if (times.length === ind + 1) return startTime <= time;
      return startTime <= time && times[ind + 1] >= time;
    });
    return {
      in: index !== -1 && this.endTimestamps[index] >= time,
      index,
    };
  }

  check(time) {
    return this.checkWithIndex(time).in;
  }
}

export class AssStream {
  constructor() {
    this.lastLines = [];
    this.timeSegments = new TimeSegments();

    this.info = {};
    this.styleFormat = [];
    this.parsedStyle = [];
    this.eventFormat = [];
    this.newParsedComments = [];
    this.newParsedDialogues = [];

    this.parsingState = 0;

    this.compiledStyles = {};
    this.compiledDialogues = [];
  }

  static getParsingState(line) {
    if (/^\[Script Info\]/i.test(line)) return 1;
    if (/^\[V4\+? Styles\]/i.test(line)) return 2;
    if (/^\[Events\]/i.test(line)) return 3;
    if (/^\[.*\]/.test(line)) return 0;
    return -1;
  }

  parse(text) {
    const lines = text.split(/\r?\n/).filter(line => !this.lastLines.includes(line));
    this.lastLines.push(...lines);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (/^;/.test(line)) continue;

      let lineParsingState = AssStream.getParsingState(line);
      if (lineParsingState === 0) continue;
      else if (lineParsingState === -1) lineParsingState = this.parsingState;
      else this.parsingState = lineParsingState;

      switch (lineParsingState) {
        default:
          continue;
        case 1: {
          if (/:/.test(line)) {
            const [, key, value] = line.match(/(.*?)\s*:\s*(.*)/);
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
            const [, key, value] = line.match(/^(\w+?)\s*:\s*(.*)/i);
            const eventType = key.toLowerCase();
            const eventValue = parseDialogue(value, this.eventFormat);
            this.timeSegments.insert(eventValue.Start, eventValue.End);
            if (eventType === 'comment') this.newParsedComments.push(eventValue);
            if (eventType === 'dialogue') this.newParsedDialogues.push(eventValue);
          }
          break;
        }
      }
    }
  }

  compile(text) {
    this.parse(text);

    this.compiledStyles = compileStyles({
      info: this.info,
      style: this.parsedStyle,
      format: this.styleFormat,
      defaultStyle: {},
    });

    this.compiledDialogues.push(...compileDialogues({
      styles: this.compiledStyles,
      dialogues: this.newParsedDialogues,
    }));
    this.newParsedDialogues = [];
  }

  get compiled() {
    return {
      info: this.info,
      width: this.info.PlayResX * 1 || null,
      height: this.info.PlayResY * 1 || null,
      collisions: this.info.Collisions || 'Normal',
      styles: this.compiledStyles,
      dialogues: this.compiledDialogues,
    };
  }
}
