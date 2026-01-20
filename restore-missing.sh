#!/bin/bash
cd /home/mike/domains/polonia

# List of missing photos to restore
photos=(
0004-1.jpg 0006-1.jpg 0007-2.jpg 0008-1.jpg 0009-1.jpg 0010-1.jpg 0012-1.jpg
0015-1.jpg 0016-1.jpg 0017-1.jpg 0018-1.jpg 0020-1.jpg 0022-1.jpg 0023-1.jpg
0025-1.jpg 0031-1.jpg 0033-1.jpg 0036-1.jpg 0037-1.jpg 0039-1.jpg 0041-1.jpg
0043-1.jpg 0044-1.jpg 0045-1.jpg 0046-1.jpg 0047-1.jpg 0048-1.jpg 0049-1.jpg
0050-1.jpg 0053-1.jpg 0054-1.jpg 0056-1.jpg 0057-1.jpg 0064-1.jpg 0073-1.jpg
0075-1.jpg 0082-1.jpg 0099-1.jpg 0100-1.jpg 0114-1.jpg 0129-1.jpg 0130-1.jpg
0133-1.jpg 0135-1.jpg 0136-1.jpg 0137-1.jpg 0138-1.jpg 0142-1.jpg 0149-1.jpg
0149-2.jpg 0154-1.jpg 0158-1.jpg 0160-1.jpg 0161-1.jpg 0162-1.jpg 0165-1.jpg
0169-1.jpg 0175-1.jpg 0178-1.jpg 0180-1.jpg 0181-2.jpg 0185-1.jpg 0186-1.jpg
)

count=0
for photo in "${photos[@]}"; do
    if [ -f "images-backup-fullres/$photo" ]; then
        # Copy and resize
        magick "images-backup-fullres/$photo" -resize "1600x1600>" -quality 85 "images/$photo"
        echo "Restored: $photo"
        ((count++))
    else
        echo "NOT FOUND in backup: $photo"
    fi
done

echo ""
echo "Restored $count photos"
