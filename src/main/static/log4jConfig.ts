import fs from 'fs/promises';
import { log4jConfigPath } from '../../main/paths';

const CONFIG = `<?xml version="1.0" encoding="UTF-8"?>
<Configuration status="WARN">
	<Appenders>
		<Console name="SysOut" target="SYSTEM_OUT">
			<PatternLayout pattern="{&quot;logger&quot;:&quot;%enc{%logger{1}}{JSON}&quot;, &quot;thread&quot;:&quot;%enc{%thread}{JSON}&quot;, &quot;level&quot;:&quot;%enc{%level}{JSON}&quot;,&quot;message&quot;: &quot;%enc{%msg}{JSON}&quot;, &quot;throwable&quot;:&quot;%enc{%xEx}{JSON}&quot;}\\n" />
		</Console>
		<Queue name="ServerGuiConsole">
			<PatternLayout pattern="[%d{HH:mm:ss} %level]: %msg{nolookups}%n" />
		</Queue>
		<RollingRandomAccessFile name="File" fileName="logs/latest.log"
			filePattern="logs/%d{yyyy-MM-dd}-%i.log.gz">
			<PatternLayout pattern="[%d{HH:mm:ss}] [%t/%level]: %msg{nolookups}%n" />
			<Policies>
				<TimeBasedTriggeringPolicy />
				<OnStartupTriggeringPolicy />
			</Policies>
		</RollingRandomAccessFile>
		<RollingRandomAccessFile name="File2" fileName="logs/latest.html"
			filePattern="logs/%d{yyyy-MM-dd}-%i.html.gz">
			<HtmlLayout />
			<Policies>
				<TimeBasedTriggeringPolicy />
				<OnStartupTriggeringPolicy />
			</Policies>
		</RollingRandomAccessFile>
	</Appenders>
	<Loggers>
		<Root level="info">
			<filters>
				<MarkerFilter marker="NETWORK_PACKETS" onMatch="DENY" onMismatch="NEUTRAL" />
			</filters>
			<AppenderRef ref="SysOut" />
			<AppenderRef ref="File" />
			<AppenderRef ref="File2" />
			<AppenderRef ref="ServerGuiConsole" />
		</Root>
	</Loggers>
</Configuration>
`;

export async function writeLog4jConfig() {
  try {
    await fs.access(log4jConfigPath);
  } catch {
    await fs.writeFile(log4jConfigPath, CONFIG);
  }
}
