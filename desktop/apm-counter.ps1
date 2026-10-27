# OPT-IN foreground-only aggregate actions per minute counter.
# Does not record keys, characters, mouse positions or event identities.
# Uses Windows OS APIs; does not access League game memory or inject code.
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Text;
public static class GameInput {
 [DllImport("user32.dll")] public static extern short GetAsyncKeyState(int vKey);
 [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hwnd, out uint processId);
}
'@
$keys = @(1,2) + (8..9) + (13..13) + (32..40) + (48..90) + (96..111) + (112..123) + (186..222)
$held=@{}; $actions=0; $sampleSeconds=5; $last=[DateTime]::UtcNow; $activeSeconds=0.0
while ($true) {
 $pidNumber=[uint32]0
 $null=[GameInput]::GetWindowThreadProcessId([GameInput]::GetForegroundWindow(),[ref]$pidNumber)
 $game=$false
 try { $proc=[Diagnostics.Process]::GetProcessById([int]$pidNumber); $game=($proc.ProcessName -match '^League of Legends$') } catch {}
 if ($game) {
   $activeSeconds+=0.025
   foreach($k in $keys) {
     $pressed=(([GameInput]::GetAsyncKeyState($k) -band 0x8000) -ne 0)
     if($pressed -and !$held[$k]) {$actions++}
     $held[$k]=$pressed
   }
 } else { $held.Clear() }
 Start-Sleep -Milliseconds 25
 $elapsed=([DateTime]::UtcNow-$last).TotalSeconds
 if($elapsed -ge $sampleSeconds){
   if($activeSeconds -gt 0) { @{actions=$actions;seconds=[Math]::Round($activeSeconds,2)} | ConvertTo-Json -Compress }
   $actions=0; $activeSeconds=0.0; $last=[DateTime]::UtcNow
 }
}
