import { parseFormat } from './parser/format';
import { parseStyle } from './parser/style';
import { parseDialogue } from './parser/dialogue';
import { compileStyles } from './compiler/styles';
import { compileDialogues } from './compiler/dialogues';

export class AssStream {
  constructor() {
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
    const lines = text.split(/\r?\n/);

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
    const result = [...this.newParsedDialogues];
    this.newParsedDialogues = [];

    return result;
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
