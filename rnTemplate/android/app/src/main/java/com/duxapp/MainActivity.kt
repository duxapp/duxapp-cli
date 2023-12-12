package {#duxapp packageName com.duxapp}

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

// expo
import expo.modules.ReactActivityDelegateWrapper

// {#duxapp-insert import}

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "duxapp"

  /**
   * Returns the instance of the {@link ReactActivityDelegate}. Here we use a util class {@link
   * DefaultReactActivityDelegate} which allows you to easily enable Fabric and Concurrent React
   * (aka React 18) with two boolean flags.
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return ReactActivityDelegateWrapper(this, BuildConfig.IS_NEW_ARCHITECTURE_ENABLED, MainActivityDelegate(
        this,
        mainComponentName,
        fabricEnabled))
  }

  class MainActivityDelegate(private var activity: ReactActivity, mainComponentName: String, fabricEnabled: Boolean) : DefaultReactActivityDelegate(activity, mainComponentName, fabricEnabled)
  {
    override fun loadApp(appKey: String) {
      // {#duxapp-insert mainActivityDelegate.loadApp}

      super.loadApp(appKey)
    }
  }
}
