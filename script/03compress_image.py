import os
from PIL import Image
import io

# 检查Pillow版本，以使用正确的抗锯齿常量
# Pillow 10.0.0 版本后，抗锯齿常量被移动到了 Image.Resampling 枚举中
try:
    from PIL import __version__ as PILLOW_VERSION
    if int(PILLOW_VERSION.split('.')[0]) >= 10:
        RESAMPLE_FILTER = Image.Resampling.LANCZOS
    else:
        RESAMPLE_FILTER = Image.LANCZOS
except (AttributeError, ImportError):
    RESAMPLE_FILTER = Image.LANCZOS

def compress_jpeg_to_size(input_path: str, output_path: str, target_kb: int = 100, resolution: tuple = (1280, 720)):
    """
    将JPG图片压缩到指定大小和分辨率。

    :param input_path: 输入图片路径
    :param output_path: 输出图片路径
    :param target_kb: 目标文件大小 (单位: KB)
    :param resolution: 目标分辨率 (宽, 高)
    """
    try:
        # 1. 打开图片
        img = Image.open(input_path)
        print(f"成功打开图片: '{input_path}'")

        # 2. 转换图片格式为RGB (JPEG不支持透明度)
        if img.mode in ('RGBA', 'P'):
            img = img.convert('RGB')
            print("图片已转换为RGB模式。")

        # 3. 调整分辨率
        img = img.resize(resolution, resample=RESAMPLE_FILTER)
        print(f"图片分辨率已调整为 {resolution[0]}x{resolution[1]}。")

        # 4. 迭代压缩，寻找最佳质量参数
        target_bytes = target_kb * 1024
        min_quality, max_quality = 10, 95

        # 从最高质量开始尝试
        for quality in range(max_quality, min_quality - 1, -5):
            # 创建一个内存中的字节流缓冲区
            buffer = io.BytesIO()
            # optimize=True可以进行额外的压缩优化
            img.save(buffer, format="JPEG", quality=quality, optimize=True)

            # 检查文件大小
            current_size = buffer.tell()
            print(f"尝试质量: {quality}, 文件大小: {current_size / 1024:.2f} KB")

            if current_size <= target_bytes:
                # 找到合适的质量，保存文件并退出循环
                with open(output_path, 'wb') as f:
                    f.write(buffer.getvalue())
                print("-" * 30)
                print(f"🎉 压缩成功! 图片已保存至 '{output_path}'")
                print(f"   - 最终质量: {quality}")
                print(f"   - 最终大小: {current_size / 1024:.2f} KB (目标: < {target_kb} KB)")
                return

        # 如果循环结束仍未达到目标大小，保存质量最低的版本作为尽力而为的结果
        print("-" * 30)
        print(f"⚠️ 警告: 即使在最低质量({min_quality})下，文件大小仍超过目标。")
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=min_quality, optimize=True)
        with open(output_path, 'wb') as f:
            f.write(buffer.getvalue())
        print(f"已保存尽力而为的版本至 '{output_path}'")
        print(f"   - 最终质量: {min_quality}")
        print(f"   - 最终大小: {buffer.tell() / 1024:.2f} KB")

    except FileNotFoundError:
        print(f"错误: 文件未找到 '{input_path}'")
    except Exception as e:
        print(f"处理图片时发生未知错误: {e}")

if __name__ == "__main__":
    # --- 使用示例 ---

    # 1. 定义输入和输出文件路径
    input_image_path = "3.jpg"
    output_image_path = "img4.jpg"

    # 2. (可选) 创建一个用于测试的示例图片
    if not os.path.exists(input_image_path):
        print(f"未找到 '{input_image_path}'，正在创建一个用于测试的图片...")
        try:
            # 创建一个色彩丰富、难以压缩的大图
            import numpy as np
            array = np.random.randint(0, 256, (1080, 1920, 3), dtype=np.uint8)
            test_img = Image.fromarray(array, 'RGB')
            test_img.save(input_image_path, quality=100)
            print("测试图片 'original_image.jpg' 已创建。")
        except ImportError:
            print("警告: 未安装 numpy，无法自动创建测试图片。请手动准备一张名为 'original_image.jpg' 的图片。")
            exit()

    # 3. 调用压缩函数
    compress_jpeg_to_size(
        input_path=input_image_path,
        output_path=output_image_path,
        target_kb=100,  # 目标大小 100KB
        resolution=(1280, 720)  # 720p 分辨率
    )