package expo.modules.stepcounter

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.concurrent.atomic.AtomicBoolean

// 폰의 걸음 센서(TYPE_STEP_COUNTER)가 부팅 뒤 센 누적 걸음 수를 그대로 읽는다.
// 오늘 걸음은 JS에서 날짜별 기준값을 빼서 계산한다. 신체 활동 권한이 있어야 값이 들어온다.
class StepCounterModule : Module() {
  private val sensorManager: SensorManager?
    get() = appContext.reactContext?.getSystemService(Context.SENSOR_SERVICE) as? SensorManager

  override fun definition() = ModuleDefinition {
    Name("StepCounter")

    Function("isAvailable") {
      sensorManager?.getDefaultSensor(Sensor.TYPE_STEP_COUNTER) != null
    }

    AsyncFunction("readAsync") { promise: Promise ->
      val manager = sensorManager
      val sensor = manager?.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
      if (manager == null || sensor == null) {
        promise.resolve(null)
        return@AsyncFunction
      }
      val done = AtomicBoolean(false)
      val handler = Handler(Looper.getMainLooper())
      lateinit var listener: SensorEventListener
      val timeout = Runnable {
        if (done.compareAndSet(false, true)) {
          manager.unregisterListener(listener)
          promise.resolve(null)
        }
      }
      listener = object : SensorEventListener {
        override fun onSensorChanged(event: SensorEvent) {
          if (done.compareAndSet(false, true)) {
            handler.removeCallbacks(timeout)
            manager.unregisterListener(this)
            promise.resolve(
              mapOf(
                "steps" to event.values[0].toDouble(),
                "bootTime" to (System.currentTimeMillis() - SystemClock.elapsedRealtime()).toDouble(),
              ),
            )
          }
        }

        override fun onAccuracyChanged(sensor: Sensor, accuracy: Int) {}
      }
      // 등록하면 센서가 현재 누적값을 곧바로 한 번 보내 준다. 오래 안 오면 읽지 못한 것으로 본다
      manager.registerListener(listener, sensor, SensorManager.SENSOR_DELAY_NORMAL, handler)
      handler.postDelayed(timeout, 5000)
    }
  }
}
