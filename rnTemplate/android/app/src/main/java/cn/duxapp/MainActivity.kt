package {#duxapp packageName cn.duxapp}
import expo.modules.ReactActivityDelegateWrapper

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

// {#duxapp-insert import}

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "duxapp"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      ReactActivityDelegateWrapper(this, BuildConfig.IS_NEW_ARCHITECTURE_ENABLED, MainActivityDelegate(this, mainComponentName, fabricEnabled))

  class MainActivityDelegate(private var activity: ReactActivity, mainComponentName: String, fabricEnabled: Boolean) : DefaultReactActivityDelegate(activity, mainComponentName, fabricEnabled)
  {
    override fun loadApp(appKey: String) {
      // {#duxapp-insert mainActivityDelegate.loadApp}

      super.loadApp(appKey)
    }
  }

  // {#duxapp-insert mainActivity}
}
