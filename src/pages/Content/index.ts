import {
  CanvasLMSEntrypoint,
  CanvasLMSConfig,
  InstallSettingsEntrypoint,
  isInstallSettings,
} from './modules/plugins/canvas';
import {
  isGradescope,
  GradescopeEntrypoint,
} from './modules/plugins/gradescope';
import {
  BlackboardEntrypoint,
  isBlackboard,
} from './modules/plugins/blackboard';
import {
  BrightspaceEntrypoint,
  isBrightspace,
} from './modules/plugins/brightspace';

/* 

Performance overhead on websites that aren't Canvas:

document.getElementById() is called once

*/
if (CanvasLMSConfig.isActive) {
  /*
  mutation observer waits for sidebar to load then injects content
  */

  console.log('Vandy Tasks: Canvas detected');

  CanvasLMSEntrypoint();

  /* 
  Allow user to modify critical settings directly on the install page
  */
  if (isInstallSettings) {
    InstallSettingsEntrypoint();
  }
} else if (isGradescope) {
  console.log('Vandy Tasks: Gradescope detected');

  GradescopeEntrypoint();
} else if (isBlackboard) {
  console.log('Vandy Tasks: Blackboard detected');

  BlackboardEntrypoint();
} else if (isBrightspace) {
  console.log('Vandy Tasks: Brightspace detected');

  BrightspaceEntrypoint();
}
