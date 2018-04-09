import * as utils from './utils';

export class LoadableImage {
  private image: Promise<HTMLImageElement>;

  constructor(opts: {
    src?: string;
    image?: {
      elem: HTMLImageElement;
      loaded: boolean;
    };
  }) {
    if (opts.src) {
      this.image = utils.loadImage(opts.src);
    } else if (opts.image) {
      if (opts.image.loaded) {
        this.image = Promise.resolve(opts.image.elem);
      } else {
        const { elem } = opts.image;
        this.image = new Promise<HTMLImageElement>((resolve, reject) => {
          elem.onload = () => resolve(elem);
          elem.onerror = reject;
        });
      }
    } else {
      throw new Error('Must provide either src or image to CoverImage constructor');
    }
  }

  public get = async () => {
    return await this.image;
  }
}
