import sys
import os
import requests

sys.stdout.reconfigure(encoding='utf-8')

REMOVE_BG_API_KEY = 'Hys8YZW9zbH3Ve4cHxfMm1Sh'

def remove_background(input_path, output_path):
    if not os.path.exists(input_path):
        print(f"❌ Input file does not exist: {input_path}")
        return

    try:
        with open(input_path, 'rb') as image_file:
            response = requests.post(
                'https://api.remove.bg/v1.0/removebg',
                files={'image_file': image_file},
                data={'size': 'auto'},
                headers={'X-Api-Key': REMOVE_BG_API_KEY},
            )

        if response.status_code == requests.codes.ok:
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            with open(output_path, 'wb') as out:
                out.write(response.content)
            print(f"✅ Background removed. Saved to: {output_path}")
        else:
            print("❌ API Error:", response.status_code, response.text)

    except Exception as e:
        print("❌ Exception occurred:", str(e))


if __name__ == '__main__':
    if len(sys.argv) != 3:
        print("Usage: python autocrop.py inputPath outputPath")
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]

    remove_background(input_path, output_path)
