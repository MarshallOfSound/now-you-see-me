/*
 * This code is a modified form of:
 * steganography.js v1.0.3 2017-09-22
 *
 * Copyright (C) 2012 Peter Eigenschink (http://www.peter-eigenschink.at/)
 * Dual-licensed under MIT and Beerware license.
*/
/**
 * This code is licensed under the MIT license
 */

import { LoadableImage } from './LoadableImage';
import * as utils from './utils';

export interface MagicianConfig {
  args: (i: number) => number;
  codeUnitSize: number;
  messageCompleted: (data: Uint8ClampedArray, i: number, threshold: number) => boolean;
  messageDelimiter: (modMessage: number[], threshold: number) => number[];
  t: number;
  threshold: number;
}

export interface MagicianOptions {
  width?: number;
  height?: number;
}

export class Magician {
  private config: MagicianConfig = {
    args: (i) => i + 1,
    codeUnitSize: 16,
    messageCompleted: (data, i) => {
      let done = true;
      for (let j = 0; j < 16 && done; j += 1) {
        done = done && (data[i + (j * 4)] === 255);
      }
      return done;
    },
    messageDelimiter: (_, threshold) => {
      const delimiter: number[] = new Array(threshold * 3);
      for (let i = 0; i < delimiter.length; i += 1) {
        delimiter[i] = 255;
      }

      return delimiter;
    },
    t: 3,
    threshold: 1,
  };

  public getHidingCapacity = async (loadableImage: LoadableImage, options: MagicianOptions = {}) => {
    const image = await loadableImage.get();

    const width = options.width || image.width;
    const height = options.height || image.height;
    const t = this.config.t;
    const codeUnitSize = this.config.codeUnitSize;

    return ((t * width * height) / codeUnitSize) >> 0;
  }

  public nowYouDont = async (message: string, loadableImage: LoadableImage, options: MagicianOptions = {}) => {
    const capacity = await this.getHidingCapacity(loadableImage, options);
    if (capacity < message.length) {
      throw new Error(`Message is too long, can only store ${capacity} chars`);
    }
    const image = await loadableImage.get();

    const t = this.config.t;
    const threshold = this.config.threshold;
    const codeUnitSize = this.config.codeUnitSize;
    const prime = utils.findNextPrime(Math.pow(2, t));
    const args = this.config.args;
    const messageDelimiter = this.config.messageDelimiter;

    if (!t || t < 1 || t > 7) {
      throw new Error(`IllegalOptions: Parameter t = "${t}" is not valid: 0 < t < 8`);
    }

    const shadowCanvas = document.createElement('canvas');
    const shadowCtx = shadowCanvas.getContext('2d');
    if (!shadowCtx) {
      throw new Error('2d contexts are not supported in this browser');
    }

    shadowCanvas.style.display = 'none';
    shadowCanvas.width = options.width || image.width;
    shadowCanvas.height = options.height || image.height;
    if (options.height && options.width) {
      shadowCtx.drawImage(image, 0, 0, options.width, options.height );
    } else {
      shadowCtx.drawImage(image, 0, 0);
    }

    const imageData = shadowCtx.getImageData(0, 0, shadowCanvas.width, shadowCanvas.height);
    const data = imageData.data;

    // bundlesPerChar ... Count of full t-bit-sized bundles per Character
    // overlapping ... Count of bits of the currently handled character which are not handled during each run
    // dec ... UTF-16 Unicode of the i-th character of the message
    // curOverlapping ... The count of the bits of the previous character not handled in the previous run
    // mask ... The raw initial bitmask, will be changed every run and if bits are overlapping
    const bundlesPerChar = codeUnitSize / t >> 0;
    const overlapping = codeUnitSize % t;
    const modMessage = [];
    let decM: number;
    let oldDec: number = 0;
    let oldMask: number;
    let left: number;
    let right: number;
    let dec: number;
    let curOverlapping: number;
    let mask: number;

    for (let i = 0; i <= message.length; i += 1) {
      dec = message.charCodeAt(i) || 0;
      curOverlapping = (overlapping * i) % t;
      if (curOverlapping > 0 && oldDec) {
        // Mask for the new character, shifted with the count of overlapping bits
        mask = Math.pow(2, t - curOverlapping) - 1;
        // Mask for the old character, i.e. the t-curOverlapping bits on the right
        // of that character
        oldMask = Math.pow(2, codeUnitSize) * (1 - Math.pow(2, -curOverlapping));
        left = (dec & mask) << curOverlapping;
        right = (oldDec & oldMask) >> (codeUnitSize - curOverlapping);
        modMessage.push(left + right);

        if (i < message.length) {
          mask = Math.pow(2, 2 * t - curOverlapping) * (1 - Math.pow(2, -t));
          for (let j = 1; j < bundlesPerChar; j += 1) {
            decM = dec & mask;
            modMessage.push(decM >> (((j - 1) * t) + (t - curOverlapping)));
            mask <<= t;
          }
          if ((overlapping * (i + 1)) % t === 0) {
            mask = Math.pow(2, codeUnitSize) * (1 - Math.pow(2, -t));
            decM = dec & mask;
            modMessage.push(decM >> (codeUnitSize - t));
          } else if (((((overlapping * (i + 1)) % t) + (t - curOverlapping)) <= t)) {
            decM = dec & mask;
            modMessage.push(decM >> (((bundlesPerChar - 1) * t) + (t - curOverlapping)));
          }
        }
      } else if (i < message.length) {
        mask = Math.pow(2, t) - 1;
        for (let j = 0; j < bundlesPerChar; j += 1) {
          decM = dec & mask;
          modMessage.push(decM >> (j * t));
          mask <<= t;
        }
      }
      oldDec = dec;
    }

    // Write Data
    let offset;
    let index: number;
    let subOffset: number = 0;
    const delimiter = messageDelimiter(modMessage, threshold);
    let q: number;
    let qS: number[];

    for (
      offset = 0;
      (offset + threshold) * 4 <= data.length && (offset + threshold) <= modMessage.length;
      offset += threshold
    ) {
      qS = [];
      for (let i = 0; i < threshold && i + offset < modMessage.length; i += 1) {
        q = 0;
        for (let j = offset; j < threshold + offset && j < modMessage.length; j += 1) {
          q += modMessage[j] * Math.pow(args(i), j - offset);
        }
        qS[i] = (255 - prime + 1) + (q % prime);
      }
      for (let i = offset * 4; i < (offset + qS.length) * 4 && i < data.length; i += 4) {
        data[i + 3] = qS[(i / 4) % threshold];
      }

      subOffset = qS.length;
    }
    // Write message-delimiter
    for (
      index = (offset + subOffset);
      index - (offset + subOffset) < delimiter.length && (offset + delimiter.length) * 4 < data.length;
      index += 1
    ) {
      data[(index * 4) + 3] = delimiter[index - (offset + subOffset)];
    }
    // Clear remaining data
    for (let i = ((index + 1) * 4) + 3; i < data.length; i += 4) {
      data[i] = 255;
    }

    imageData.data.set(data);
    shadowCtx.putImageData(imageData, 0, 0);

    return shadowCanvas.toDataURL();
  }

  public nowYouSeeMe = async (loadableImage: LoadableImage, options: MagicianOptions = {}) => {
    const image = await loadableImage.get();

    const t = this.config.t;
    const threshold = this.config.threshold;
    const codeUnitSize = this.config.codeUnitSize;
    const prime = utils.findNextPrime(Math.pow(2, t));
    const messageCompleted = this.config.messageCompleted;

    if (!t || t < 1 || t > 7) {
      throw new Error(`IllegalOptions: Parameter t = "${t}}" is not valid: 0 < t < 8`);
    }

    const shadowCanvas = document.createElement('canvas');
    const shadowCtx = shadowCanvas.getContext('2d');

    if (!shadowCtx) {
      throw new Error('2d contexts are not supported in this browser');
    }

    shadowCanvas.style.display = 'none';
    shadowCanvas.width = options.width || image.width;
    shadowCanvas.height = options.width || image.height;
    if (options.height && options.width) {
      shadowCtx.drawImage(image, 0, 0, options.width, options.height );
    } else {
      shadowCtx.drawImage(image, 0, 0);
    }

    const imageData = shadowCtx.getImageData(0, 0, shadowCanvas.width, shadowCanvas.height);
    const data = imageData.data;
    const modMessage: number[] = [];

    let done: boolean;
    if (threshold === 1) {
      let i: number;
      for (i = 3, done = false; !done && i < data.length && !done; i += 4) {
        done = messageCompleted(data, i, threshold);
        if (!done) {
          modMessage.push(data[i] - (255 - prime + 1));
        }
      }
    } else {
      throw new Error(`Unsupported threshold value: ${threshold}`);
    }

    let message = '';
    let charCode = 0;
    let bitCount = 0;
    const mask = Math.pow(2, codeUnitSize) - 1;

    modMessage.pop();

    for (const item of modMessage) {
      charCode += item << bitCount;
      bitCount += t;
      if (bitCount >= codeUnitSize) {
        message += String.fromCharCode(charCode & mask);
        bitCount %= codeUnitSize;
        charCode = item >> (t - bitCount);
      }
    }

    return message;
  }
}
