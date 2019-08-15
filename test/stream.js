import { expect } from 'chai';
import { TimeSegments } from '../src/stream';

describe('TimeSegments', () => {
  let timeSeg = new TimeSegments();
  beforeEach(() => {
    timeSeg = new TimeSegments();
    timeSeg.startTimestamps = [1, 3, 5];
    timeSeg.endTimestamps = [2, 4, 6];
  });

  describe('checkWithIndex', () => {
    it('should return false and -1 when time is lower than least', () => {
      const result = timeSeg.checkWithIndex(0.5);

      expect(result).to.deep.equal({ in: false, index: -1 });
    });

    it('should return true and index when time in range', () => {
      const result = timeSeg.checkWithIndex(1.5);

      expect(result).to.deep.equal({ in: true, index: 0 });
    });

    it('should return false and index when time is not in range', () => {
      const result = timeSeg.checkWithIndex(4.5);

      expect(result).to.deep.equal({ in: false, index: 1 });
    });
  });

  describe('insert', () => {
    it('start in range, end in range, start index and end index are equal', () => {
      timeSeg.insert(1.25, 1.75);

      expect(timeSeg.startTimestamps).to.deep.equal([1, 3, 5]);
      expect(timeSeg.endTimestamps).to.deep.equal([2, 4, 6]);
    });
    it('start in range, end not in range, start index and end index are equal', () => {
      timeSeg.insert(1.5, 2.5);

      expect(timeSeg.startTimestamps).to.deep.equal([1, 3, 5]);
      expect(timeSeg.endTimestamps).to.deep.equal([2.5, 4, 6]);
    });
    it('start not in range, end not in range, start index and end index are equal', () => {
      timeSeg.insert(2.25, 2.75);

      expect(timeSeg.startTimestamps).to.deep.equal([1, 2.25, 3, 5]);
      expect(timeSeg.endTimestamps).to.deep.equal([2, 2.75, 4, 6]);
    });
    it('start in range, end in range, start index and end index are not equal', () => {
      timeSeg.insert(1.5, 3.5);

      expect(timeSeg.startTimestamps).to.deep.equal([1, 5]);
      expect(timeSeg.endTimestamps).to.deep.equal([4, 6]);
    });
    it('start in range, end not in range, start index and end index are not equal', () => {
      timeSeg.insert(1.5, 4.5);

      expect(timeSeg.startTimestamps).to.deep.equal([1, 5]);
      expect(timeSeg.endTimestamps).to.deep.equal([4.5, 6]);
    });
    it('start not in range, end in range, start index and end index are not equal', () => {
      timeSeg.insert(2.5, 3.5);

      expect(timeSeg.startTimestamps).to.deep.equal([1, 2.5, 5]);
      expect(timeSeg.endTimestamps).to.deep.equal([2, 4, 6]);
    });
    it('start not in range, end not in range, start index and end index are not equal', () => {
      timeSeg.insert(2.5, 4.5);

      expect(timeSeg.startTimestamps).to.deep.equal([1, 2.5, 5]);
      expect(timeSeg.endTimestamps).to.deep.equal([2, 4.5, 6]);
    });
  });
});
