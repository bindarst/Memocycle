/* eslint-disable @typescript-eslint/no-require-imports */
const { withAndroidManifest, withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const provider = `package app.memocycle.mobile

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews

class MemocycleWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
    ids.forEach { id ->
      val intent = Intent(Intent.ACTION_VIEW, Uri.parse("memocycle://"), context, MainActivity::class.java)
      val pending = PendingIntent.getActivity(context, id, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
      val views = RemoteViews(context.packageName, R.layout.memocycle_widget)
      views.setOnClickPendingIntent(R.id.widget_root, pending)
      views.setOnClickPendingIntent(R.id.widget_action, pending)
      manager.updateAppWidget(id, views)
    }
  }
}`;

const layout = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android" android:id="@+id/widget_root" android:layout_width="match_parent" android:layout_height="match_parent" android:orientation="vertical" android:gravity="center_vertical" android:padding="16dp" android:background="@drawable/memocycle_widget_bg">
  <TextView android:layout_width="wrap_content" android:layout_height="wrap_content" android:text="MémoCycle" android:textColor="#0F172A" android:textStyle="bold" android:textSize="18sp" />
  <TextView android:layout_width="wrap_content" android:layout_height="wrap_content" android:layout_marginTop="4dp" android:text="Ta prochaine priorité t’attend." android:textColor="#64748B" android:textSize="13sp" />
  <TextView android:id="@+id/widget_action" android:layout_width="wrap_content" android:layout_height="wrap_content" android:layout_marginTop="12dp" android:paddingLeft="14dp" android:paddingRight="14dp" android:paddingTop="8dp" android:paddingBottom="8dp" android:background="@drawable/memocycle_widget_button" android:text="Réviser maintenant" android:textColor="#FFFFFF" android:textStyle="bold" android:textSize="13sp" />
</LinearLayout>`;

const background = `<?xml version="1.0" encoding="utf-8"?><shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle"><solid android:color="#F8FAFC"/><corners android:radius="20dp"/><stroke android:width="1dp" android:color="#DDE3EA"/></shape>`;
const button = `<?xml version="1.0" encoding="utf-8"?><shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle"><solid android:color="#0F62FE"/><corners android:radius="12dp"/></shape>`;
const info = `<?xml version="1.0" encoding="utf-8"?><appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android" android:minWidth="250dp" android:minHeight="110dp" android:updatePeriodMillis="1800000" android:initialLayout="@layout/memocycle_widget" android:resizeMode="horizontal|vertical" android:widgetCategory="home_screen" android:description="@string/memocycle_widget_description"/>`;

module.exports = function withMemocycleWidget(config) {
  config = withAndroidManifest(config, (mod) => {
    const app = mod.modResults.manifest.application[0];
    app.receiver = app.receiver || [];
    if (!app.receiver.some((item) => item.$?.["android:name"] === ".MemocycleWidgetProvider")) {
      app.receiver.push({
        $: { "android:name": ".MemocycleWidgetProvider", "android:exported": "false" },
        "intent-filter": [{ action: [{ $: { "android:name": "android.appwidget.action.APPWIDGET_UPDATE" } }] }],
        "meta-data": [{ $: { "android:name": "android.appwidget.provider", "android:resource": "@xml/memocycle_widget_info" } }],
      });
    }
    return mod;
  });
  return withDangerousMod(config, ["android", async (mod) => {
    const root = mod.modRequest.platformProjectRoot;
    const write = (relative, content) => {
      const target = path.join(root, relative);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, content);
    };
    write("app/src/main/java/app/memocycle/mobile/MemocycleWidgetProvider.kt", provider);
    write("app/src/main/res/layout/memocycle_widget.xml", layout);
    write("app/src/main/res/drawable/memocycle_widget_bg.xml", background);
    write("app/src/main/res/drawable/memocycle_widget_button.xml", button);
    write("app/src/main/res/xml/memocycle_widget_info.xml", info);
    const stringsPath = path.join(root, "app/src/main/res/values/strings.xml");
    let strings = fs.readFileSync(stringsPath, "utf8");
    if (!strings.includes("memocycle_widget_description")) strings = strings.replace("</resources>", "  <string name=\"memocycle_widget_description\">Révisions MémoCycle</string>\n</resources>");
    fs.writeFileSync(stringsPath, strings);
    return mod;
  }]);
};
