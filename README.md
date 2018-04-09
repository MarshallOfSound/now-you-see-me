Now You See Me
-----------

> A JS implementation of steganography for png files

## Installation

```bash
npm i --save-dev now-you-see-me
```

## API

### Class: `LoadableImage`

```js
import { LoadableImage } from 'now-you-see-me';

// Loading remote
const myImage = new LoadableImage({
  src: 'http://mydomain.com/image.png',
});

// Loading base64 image
const htmlImage = new Image();
htmlImage.src = 'base64-string';
const myOtherImage = new LoadableImage({
  image: {
    elem: htmlImage,
    loaded: false,
  }
});
```

### Class: `Magician`

```js
import { Magician } from 'now-you-see-me'

const magician = new Magician();

// Conceal some words
magician.nowYouDont('secret words', myImage)
  .then((base64Image) => {
    // Get them back again
    return magician.nowYouSeeMe(new LoadableImage({ src: base64Image }));
  })
  .then((words) => {
    // words === 'secret words'
  })
```

#### `magician.nowYouDont(message: string, loadableImage: LoadableImage)`

Returns a `Promise` that resolves with a base 64 encoded PNG image with the
message encoded inside;

#### `magician.nowYouSeeMe(loadableImage: LoadableImage)`

Returns a `Promise` of that resolve with a utf8 string containing the original
message that the given image contained;