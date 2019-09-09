import time
import datetime
import math

from PIL import Image, ImageDraw

magnif = 1000000000000000
# magnif = 10000000000000000000

hover_x = 0.3602404434376143632361252444495453084826078079585857504883758147401953460592
hover_y = 0.6413130610648031748603750151793020665794949522823052595561775430644485741727

# hover_x = float(0.00)
# hover_y = float(0.00)

width = 1920
height = 1080

ts = time.time()

strts = datetime.datetime.fromtimestamp(ts).strftime('%Y-%m-%d_%H-%M-%S')
 
img = Image.new('RGB', (width, height), color = (0, 0, 0))
draw = ImageDraw.Draw(img)

def get_max_iterations(magnif):
    return round((50 * math.log10(magnif)) ** 1.25)

def get_coord_bailout(x, y, max):
    re = float(x);
    im = float(y);

    re2 = x * x;
    im2 = y * y;

    for i in range(max):
        im = im * re;
        im = im + im + y;

        re = re2 - im2 + x;

        re2 = re * re;
        im2 = im * im;

        if (re2 + im2 > 4):
            return i

    return None;

def mandel_render(magnif, hover_x, hover_y):

    max_iterations = get_max_iterations(magnif)


    real_width_half = float(width >> 1) / float(magnif)
    real_height_half = float(height >> 1) / float(magnif)

    real_width_step = float(1) / float(magnif)
    real_height_step = float(1) / float(magnif)

    real_x_current = hover_x - real_width_half
    real_y_current = hover_y - real_height_half

    print (real_x_current, real_y_current)

    print('Rendering mandel with magnif', magnif, 'with max iterations', max_iterations)

    ts_s = time.time()

    for y in range(height):
        
        real_x_current = hover_x - real_width_half

        for x in range(width):

            iterations = get_coord_bailout(real_x_current, real_y_current, max_iterations)
            
            if iterations:
                color = 'hsl(%d, %d%%, %.2f%%)' % (0, 100, iterations * 100 / max_iterations)
            else:
                color = 'hsl(%d, %d%%, %d%%)' % (0, 100, 0)

            draw.point((x, y), fill=color)

            real_x_current += real_width_step

        real_y_current += real_height_step

    ts_e = time.time()

    print (real_x_current, real_y_current)

    print('Rendering mandel finished, time taken ', ts_e - ts_s)

mandel_render(magnif, hover_x, hover_y)

img.save('mandel_' + strts + '.png')