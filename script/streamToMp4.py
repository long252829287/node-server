import subprocess
import os

def download_and_merge_m3u8_stream(url, output_file):
    # 创建 temp 文件夹
    os.makedirs('temp', exist_ok=True)

    # 下载 M3U8 流
    subprocess.run(['E:\\ffmpeg\\ffmpeg-master-latest-win64-gpl\\bin\\ffmpeg.exe', '-i', url, '-c', 'copy', '-bsf:a', 'aac_adtstoasc', 'temp/segment_%03d.ts'])

    # 生成文件列表
    with open('temp/filelist.txt', 'w') as f:
        for i in range(1, 1000):  # 假设最多有1000个分段文件
            segment_file = f'temp/segment_{i:03d}.ts'
            if os.path.exists(segment_file):
                f.write(f"file '{segment_file}'\n")
            else:
                break

    # 转码 AAC 音频
    subprocess.run(['E:\\ffmpeg\\ffmpeg-master-latest-win64-gpl\\bin\\ffmpeg.exe', '-i', url, '-c:a', 'aac', '-b:a', '128k', '-vn', 'temp/audio.aac'])

    # 合并分段文件
    subprocess.run(['E:\\ffmpeg\\ffmpeg-master-latest-win64-gpl\\bin\\ffmpeg.exe', '-f', 'concat', '-safe', '0', '-i', 'temp/filelist.txt', '-i', 'temp/audio.aac', '-c', 'copy', output_file])

    # 清理临时文件
    subprocess.run(['rm', 'temp/segment_*.ts'])
    subprocess.run(['rm', 'temp/filelist.txt'])
    subprocess.run(['rm', 'temp/audio.aac'])

# 示例用法
m3u8_url = "https://vod.duanshu.com/e4a62924vodtransgzp1253562005/92f7cf3e3270835009420822927/v.f22311.m3u8?t=658b8c0e&us=peqcjomtsb&sign=4355257a085e2679d8691828a44dcc4e"
output_file = "output.mp4"
download_and_merge_m3u8_stream(m3u8_url, output_file)
