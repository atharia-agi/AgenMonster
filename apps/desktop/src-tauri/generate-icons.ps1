Add-Type -AssemblyName System.Drawing

function New-PixelArtIcon {
    param(
        [int]$Size = 1024,
        [string]$OutputPath
    )
    
    $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
    $g.Clear([System.Drawing.Color]::FromArgb(255, 18, 18, 24))
    
    $pixelSize = [Math]::Max(1, [Math]::Floor($Size / 64))
    $centerX = [Math]::Floor($Size / 2)
    $centerY = [Math]::Floor($Size / 2)
    
    # Colors
    $bodyColor = [System.Drawing.Color]::FromArgb(255, 45, 45, 65)
    $bodyHighlight = [System.Drawing.Color]::FromArgb(255, 60, 60, 85)
    $eyeWhite = [System.Drawing.Color]::FromArgb(255, 240, 240, 255)
    $eyePupil = [System.Drawing.Color]::FromArgb(255, 20, 20, 30)
    $eyeGlow = [System.Drawing.Color]::FromArgb(255, 80, 240, 220)
    $mouthColor = [System.Drawing.Color]::FromArgb(255, 100, 100, 130)
    $accentColor = [System.Drawing.Color]::FromArgb(255, 80, 240, 220)
    $sparkleColor = [System.Drawing.Color]::FromArgb(255, 160, 120, 240)
    
    # Helper to draw a pixel block
    function Draw-PixelBlock {
        param($x, $y, $color, $size)
        $brush = New-Object System.Drawing.SolidBrush($color)
        $g.FillRectangle($brush, $x * $size, $y * $size, $size, $size)
        $brush.Dispose()
    }
    
    $ps = [Math]::Max(1, [Math]::Floor($Size / 64))
    $cx = [Math]::Floor($Size / 2 / $pixelSize)
    $cy = [Math]::Floor($Size / 2 / $pixelSize)
    
    # Main body - rounded dome shape
    for ($y = -24; $y -le 20; $y++) {
        for ($x = -20; $x -le 20; $x++) {
            $dx = $x / 20.0
            $dy = ($y - 5) / 24.0
            $dist = [Math]::Sqrt($dx * $dx + $dy * $dy)
            if ($dist -le 1.0) {
                $edgeFade = 1.0 - [Math]::Pow($dist, 4)
                $baseR = 45 + ($edgeFade * 15)
                $baseG = 45 + ($edgeFade * 15)
                $baseB = 65 + ($edgeFade * 20)
                $pixelColor = [System.Drawing.Color]::FromArgb(255, [Math]::Floor($baseR), [Math]::Floor($baseG), [Math]::Floor($baseB))
                Draw-PixelBlock -x ($cx + $x) -y ($cy + $y) -color $pixelColor -size $ps
            }
        }
    }
    
    # Body highlight (top left glow)
    for ($y = -20; $y -le 0; $y++) {
        for ($x = -18; $x -le -5; $x++) {
            $dx = ($x + 10) / 10.0
            $dy = ($y + 10) / 10.0
            $dist = [Math]::Sqrt($dx * $dx + $dy * $dy)
            if ($dist -le 1.0) {
                $alpha = (1.0 - $dist) * 0.3
                $pixelColor = [System.Drawing.Color]::FromArgb(255, [Math]::Floor(80 + $alpha * 40), [Math]::Floor(80 + $alpha * 40), [Math]::Floor(110 + $alpha * 30))
                Draw-PixelBlock -x ($cx + $x) -y ($cy + $y) -color $pixelColor -size $ps
            }
        }
    }
    
    # Left eye white
    for ($y = -7; $y -le 7; $y++) {
        for ($x = -7; $x -le 7; $x++) {
            if (($x * $x + $y * $y) -le 49) {
                Draw-PixelBlock -x ($cx - 8 + $x) -y ($cy - 5 + $y) -color $eyeWhite -size $ps
            }
        }
    }
    # Right eye white
    for ($y = -7; $y -le 7; $y++) {
        for ($x = -7; $x -le 7; $x++) {
            if (($x * $x + $y * $y) -le 49) {
                Draw-PixelBlock -x ($cx + 8 + $x) -y ($cy - 5 + $y) -color $eyeWhite -size $ps
            }
        }
    }
    
    # Eye pupils
    for ($y = -4; $y -le 4; $y++) {
        for ($x = -4; $x -le 4; $x++) {
            if (($x * $x + $y * $y) -le 16) {
                Draw-PixelBlock -x ($cx - 7 + $x) -y ($cy - 4 + $y) -color $eyePupil -size $ps
                Draw-PixelBlock -x ($cx + 9 + $x) -y ($cy - 4 + $y) -color $eyePupil -size $ps
            }
        }
    }
    
    # Eye glow highlights
    for ($i = 0; $i -lt 3; $i++) {
        Draw-PixelBlock -x ($cx - 9 + $i) -y ($cy - 7) -color $eyeGlow -size $ps
        Draw-PixelBlock -x ($cx + 7 + $i) -y ($cy - 7) -color $eyeGlow -size $ps
    }
    
    # Smile/mouth
    for ($x = -6; $x -le 6; $x++) {
        $mouthY = $cy + 6 + [Math]::Floor([Math]::Pow($x / 6.0, 2) * 3)
        Draw-PixelBlock -x ($cx + $x) -y $mouthY -color $mouthColor -size $ps
        if ([Math]::Abs($x) -le 4) {
            Draw-PixelBlock -x ($cx + $x) -y ($mouthY + 1) -color $mouthColor -size $ps
        }
    }
    
    # Antenna/horns
    for ($y = -30; $y -le -24; $y++) {
        Draw-PixelBlock -x ($cx - 3) -y $y -color $accentColor -size $ps
        Draw-PixelBlock -x ($cx + 3) -y $y -color $accentColor -size $ps
    }
    # Antenna tips (sparkle)
    Draw-PixelBlock -x ($cx - 3) -y (-31) -color $sparkleColor -size $ps
    Draw-PixelBlock -x ($cx + 3) -y (-31) -color $sparkleColor -size $ps
    
    # Cheek blush (left)
    for ($dy = 0; $dy -lt 3; $dy++) {
        for ($dx = 0; $dx -lt 2; $dx++) {
            $blushColor = [System.Drawing.Color]::FromArgb(120, 220, 120, 160)
            Draw-PixelBlock -x ($cx - 16 + $dx) -y ($cy + 2 + $dy) -color $blushColor -size $ps
        }
    }
    # Cheek blush (right)
    for ($dy = 0; $dy -lt 3; $dy++) {
        for ($dx = 0; $dx -lt 2; $dx++) {
            $blushColor = [System.Drawing.Color]::FromArgb(120, 220, 120, 160)
            Draw-PixelBlock -x ($cx + 14 + $dx) -y ($cy + 2 + $dy) -color $blushColor -size $ps
        }
    }
    
    # Body outline glow
    for ($y = -24; $y -le 20; $y++) {
        for ($x = -20; $x -le 20; $x++) {
            $dx = $x / 20.0
            $dy = ($y - 5) / 24.0
            $dist = [Math]::Sqrt($dx * $dx + $dy * $dy)
            if ($dist -gt 0.85 -and $dist -le 1.0) {
                $pixelColor = [System.Drawing.Color]::FromArgb(60, 80, 240, 220)
                Draw-PixelBlock -x ($cx + $x) -y ($cy + $y) -color $pixelColor -size $ps
            }
        }
    }
    
    # Save
    $bmp.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Created: $OutputPath"
}

# Generate icons
$iconDir = "K:\AgenMonster\apps\desktop\src-tauri\icons"
New-PixelArtIcon -Size 1024 -OutputPath "$iconDir\icon.png"
New-PixelArtIcon -Size 128 -OutputPath "$iconDir\128x128.png"
New-PixelArtIcon -Size 128 -OutputPath "$iconDir\128x128@2x.png"
New-PixelArtIcon -Size 32 -OutputPath "$iconDir\32x32.png"
New-PixelArtIcon -Size 64 -OutputPath "$iconDir\64x64.png"

# Create simple ICO using Windows API
Add-Type @"
using System;
using System.IO;
using System.Drawing;
using System.Drawing.Imaging;

public class IcoMaker {
    public static void CreateIco(string pngPath, string icoPath) {
        using (Bitmap bmp = new Bitmap(pngPath)) {
            using (FileStream fs = new FileStream(icoPath, FileMode.Create)) {
                using (MemoryStream ms = new MemoryStream()) {
                    bmp.Save(ms, ImageFormat.Png);
                    byte[] pngBytes = ms.ToArray();
                    
                    // ICO header
                    fs.WriteByte(0);
                    fs.WriteByte(0);
                    fs.WriteByte(1);
                    fs.WriteByte(0);
                    
                    // Number of images
                    short numImages = 1;
                    fs.WriteByte((byte)(numImages & 0xFF));
                    fs.WriteByte((byte)((numImages >> 8) & 0xFF));
                    
                    // Image entry
                    int width = bmp.Width;
                    int height = bmp.Height;
                    fs.WriteByte((byte)(width == 256 ? 0 : width));
                    fs.WriteByte((byte)(height == 256 ? 0 : height));
                    fs.WriteByte(0); // color palette
                    fs.WriteByte(0); // reserved
                    fs.WriteByte(1); // color planes
                    fs.WriteByte(0);
                    fs.WriteByte(32); // bits per pixel
                    fs.WriteByte(0);
                    
                    int size = pngBytes.Length;
                    int offset = 6 + 16;
                    fs.WriteByte((byte)(size & 0xFF));
                    fs.WriteByte((byte)((size >> 8) & 0xFF));
                    fs.WriteByte((byte)((size >> 16) & 0xFF));
                    fs.WriteByte((byte)((size >> 24) & 0xFF));
                    fs.WriteByte((byte)(offset & 0xFF));
                    fs.WriteByte((byte)((offset >> 8) & 0xFF));
                    fs.WriteByte((byte)((offset >> 16) & 0xFF));
                    fs.WriteByte((byte)((offset >> 24) & 0xFF));
                    
                    fs.Write(pngBytes, 0, pngBytes.Length);
                }
            }
        }
        Console.WriteLine("Created: " + icoPath);
    }
}
"@

$icoMaker = New-Object IcoMaker
$icoMaker.CreateIco("$iconDir\icon.png", "$iconDir\icon.ico")

Write-Host "`nAll icons generated successfully!"
