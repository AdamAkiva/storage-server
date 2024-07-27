import { Router } from '../../utils/index.js';

import * as FileController from './controller.js';

/**********************************************************************************/

export default Router()
  .post('/', FileController.uploadLocalFile)
  .post('/secure', FileController.uploadLocalSecureFile);
