# oh-my-agent v2 — Demo Recording
# Usage: vhs docs/demo/demo.tape (from project root)
# Requires: brew install vhs (installs ttyd + ffmpeg automatically)

Output web/public/oh-my-ag.mp4
Output docs/demo/oh-my-ag.gif

Set Shell "bash"
Set FontFamily "Hack Nerd Font"
Set FontSize 16
Set Width 1200
Set Height 620
Set Padding 30
Set Margin 60
Set MarginFill "#09090b"
Set WindowBar Colorful
Set WindowBarSize 40
Set Theme "Catppuccin Mocha"
Set TypingSpeed 50ms
Set Framerate 60

Hide
Type "bash docs/demo/demo-v2.sh"
Enter
Sleep 0.5s
Show

Sleep 26s
