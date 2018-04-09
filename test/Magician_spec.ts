import { expect } from 'chai';
import * as crypto from 'crypto';
import * as fs from 'fs-extra';
import * as path from 'path';

import * as magic from '../src';

const emptyImg = path.resolve(__dirname, 'empty.png');

const BYTES = 10000;
const RANDOM_TESTS = 1000;

describe('Magician', () => {
  describe('happy path', () => {
    it('should be able to do read-write', async () => {
      const magician = new magic.Magician();
      const encoded = await magician.nowYouDont(
        'message',
        new magic.LoadableImage({
          src: `data:image/png;base64,${await fs.readFile(emptyImg, 'base64')}`,
        }),
      );
      // Prove no data is shared
      const magician2 = new magic.Magician();
      const revealed = await magician2.nowYouSeeMe(new magic.LoadableImage({
        src: encoded,
      }));
      expect(revealed).to.equal('message');
    });

    it('should error out if the message is too long', async () => {
      const magician = new magic.Magician();
      let e: Error | null = null;
      try {
        await magician.nowYouDont(
          crypto.randomBytes(BYTES * BYTES * BYTES).toString('base64'),
          new magic.LoadableImage({
            src: `data:image/png;base64,${await fs.readFile(emptyImg, 'base64')}`,
          }),
        );
      } catch (err) {
        e = err;
      }
      expect(e).to.not.equal(null);
    });
  });

  describe('brute force testing', () => {
    for (let i = 0; i < RANDOM_TESTS; i += 1) {
      it(`should be able to do read-write for random string set (${i + 1})`, async () => {
        const message = crypto.randomBytes(BYTES).toString('base64');
        const magician = new magic.Magician();
        const encoded = await magician.nowYouDont(
          message,
          new magic.LoadableImage({
            src: `data:image/png;base64,${await fs.readFile(emptyImg, 'base64')}`,
          }),
        );
        // Prove no data is shared
        const magician2 = new magic.Magician();
        const revealed = await magician2.nowYouSeeMe(new magic.LoadableImage({
          src: encoded,
        }));
        expect(revealed).to.equal(message);
      });
    }
  });
});
