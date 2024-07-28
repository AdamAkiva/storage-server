import { Router } from '../../utils/index.js';

import * as FileController from './controller.js';

/**********************************************************************************/

export default Router().post(
  '/:storageMedium/:encryption',
  FileController.uploadFile
);
