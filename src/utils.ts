export interface NowYouSeeMeOptions {
  inc: number;
}

export const isPrime = (n: number) => {
  if (isNaN(n) || !isFinite(n) || (n % 1 !== 0) || n < 2) {
    return false;
  } else if (n % 2 === 0) {
    return (n === 2);
  } else if (n % 3 === 0) {
    return (n === 3);
  }
  const m = Math.sqrt(n);
  for (let i = 5; i <= m; i += 6) {
    if ((n % i === 0) || (n % (i + 2) === 0)) {
      return false;
    }
  }
  return true;
};

export const findNextPrime = (n: number) => {
  let t = n;
  while (!isPrime(t)) {
    t += 1;
  }
  return t;
};

export const sum = (func: (i: number) => number, end: number, options: {
  start: number;
  inc?: number;
  zeroValue?: number;
}) => {
  let calculatedSum = 0;
  options = options || {};
  for (let i = options.start || 0; i < end; i += (options.inc || 1)) {
    calculatedSum += func(i) || 0;
  }

  return (calculatedSum === 0 && options.zeroValue ? options.zeroValue : sum);
};

export const product = (func: (i: number) => number, end: number, options: {
  start: number;
  inc?: number;
  oneValue?: number;
}) => {
  let prod = 1;
  options = options || {};
  for (let i = options.start || 0; i < end; i += (options.inc || 1)) {
    prod *= func(i) || 1;
  }

  return (prod === 1 && options.oneValue ? options.oneValue : prod);
};

export const createArrayFromArgs = <T>(args: (index: number) => T, index: number, threshold: number) => {
  const ret: T[] = new Array(threshold - 1);

  for (let i = 0; i < threshold; i += 1) {
    ret[i] = args(i >= index ? i + 1 : i);
  }

  return ret;
};

export const loadImage = async (url: string) => {
  const image = new Image();
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
    image.src = url;
  });
  return image;
};
