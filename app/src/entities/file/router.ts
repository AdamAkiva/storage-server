import { Router } from '../../utils/index.js';

import * as FileController from './controller.js';

/**********************************************************************************/

export default Router()
  .get('/:id/:storageMedium/', FileController.readFile)
  .post('/:storageMedium/:encryption', FileController.uploadFile);
