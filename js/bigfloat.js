// This file is part of bigfloat, copyright (c) 2015- BusFaster Ltd.
// Released under the MIT license, see LICENSE.
/** Base for calculations, the bigger the better but must fit in 32 bits. */
var limbSize32 = Math.pow(2, 32);
var limbInv32 = Math.pow(2, -32);
var limbsPerDigit32 = Math.log(10) / (32 * Math.log(2));
/** Create a string with the given number of zero digits. */
function zeroes(count) {
    return (new Array(count + 1).join('0'));
}
var BaseInfo32 = /** @class */ (function () {
    function BaseInfo32(base) {
        this.base = base;
        /** Average number of digits per limb. */
        this.limbDigitsExact = Math.log(limbSize32) / Math.log(this.base);
        /** Number of entire digits per limb. */
        this.limbDigits = ~~this.limbDigitsExact;
        /** Maximum power of base that fits in a limb. */
        this.limbBase = Math.pow(this.base, this.limbDigits);
        /** String of zeroes for padding an empty limb. */
        this.pad = zeroes(this.limbDigits);
    }
    BaseInfo32.init = function (base) {
        return (BaseInfo32.baseTbl[base] || (BaseInfo32.baseTbl[base] = new BaseInfo32(base)));
    };
    BaseInfo32.baseTbl = {};
    return BaseInfo32;
}());

// This file is part of bigfloat, copyright (c) 2015- BusFaster Ltd.
/** Remove leading and trailing insignificant zero digits. */
function trimNumber(str) {
    return (str
        .replace(/^(-?)0+([1-9a-z]|0(\.|$))/, '$1$2')
        .replace(/(\.|(\.[0-9a-z]*[1-9a-z]))0+$/, '$2'));
}
/** Output EXACT value of an IEEE 754 double in any base supported by Number.toString.
     * Exponent must be between -2 and 61, and last 3 bits of mantissa must be 0.
    * Useful for debugging. */
function numberToString(dbl, base) {
    if (base === void 0) { base = 10; }
    var _a = BaseInfo32.init(base), pad = _a.pad, limbBase = _a.limbBase;
    var sign = '';
    var out = '';
    var limb;
    var limbStr;
    if (isNaN(dbl))
        return ('NaN');
    // For negative numbers, output sign and get absolute value.
    if (dbl < 0) {
        sign = '-';
        dbl = -dbl;
    }
    if (!isFinite(dbl))
        return (sign + 'Inf');
    if (dbl < 1) {
        out += '0';
    }
    else {
        var iPart = Math.floor(dbl);
        dbl -= iPart;
        while (iPart) {
            // Extract groups of digits starting from the least significant.
            limb = iPart % limbBase;
            iPart = (iPart - limb) / limbBase;
            limbStr = limb.toString(base);
            // Prepend digits to result.
            out = limbStr + out;
            // If more limbs remain, pad with zeroes to group length.
            if (iPart)
                out = pad.substr(limbStr.length) + out;
        }
    }
    // Is there a fractional part remaining?
    if (dbl > 0) {
        out += '.';
        if (limbBase != limbSize32) {
            limbBase = base;
            pad = '';
        }
        while (dbl) {
            // Extract groups of digits starting from the most significant.
            dbl *= limbBase;
            limb = dbl >>> 0;
            dbl -= limb;
            limbStr = limb.toString(base);
            // Append digits to result and pad with zeroes to group length.
            out += pad.substr(limbStr.length) + limbStr;
        }
    }
    // Remove trailing zeroes.
    return (sign + out.replace(/(\.[0-9a-z]*[1-9a-z])0+$/, '$1'));
}

// This file is part of bigfloat, copyright (c) 2015- BusFaster Ltd.
var BigFloat32 = /** @class */ (function () {
    function BigFloat32(value, base) {
        /** List of digits in base 2^32, least significant first. */
        this.limbList = [];
        value ? this.setValue(value, base) : this.setZero();
    }
    BigFloat32.prototype.clone = function () {
        return (new BigFloat32().setBig(this));
    };
    BigFloat32.prototype.setZero = function () {
        this.sign = 1;
        this.fractionLen = 0;
        this.len = 0;
        return (this);
    };
    BigFloat32.prototype.setValue = function (other, base) {
        if (typeof (other) == 'number') {
            return (this.setNumber(other));
        }
        if (other instanceof BigFloat32) {
            return (this.setBig(other));
        }
        return (this.setString(other.toString(), base || 10));
    };
    BigFloat32.prototype.setBig = function (other) {
        var len = other.len;
        this.sign = other.sign;
        this.fractionLen = other.fractionLen;
        this.len = len;
        for (var pos = 0; pos < len; ++pos) {
            this.limbList[pos] = other.limbList[pos];
        }
        return (this);
    };
    /** Set value from a floating point number (probably IEEE 754 double). */
    BigFloat32.prototype.setNumber = function (value) {
        if (value < 0) {
            value = -value;
            this.sign = -1;
        }
        else {
            this.sign = 1;
        }
        var iPart = Math.floor(value);
        var fPart = value - iPart;
        var fractionLen = 0;
        var limbList = this.limbList;
        var limb;
        var len = 0;
        // Handle fractional part.
        while (fPart) {
            // Extract limbs starting from the most significant.
            fPart *= limbSize32;
            limb = fPart >>> 0;
            fPart -= limb;
            // Append limb to value (limbs are reversed later).
            limbList[len++] = limb;
            ++fractionLen;
        }
        // Reverse array from 0 to len.
        var pos = 0;
        while (--len > pos) {
            limb = limbList[pos];
            limbList[pos++] = limbList[len];
            limbList[len] = limb;
        }
        len += pos + 1;
        // Handle integer part.
        while (iPart) {
            // Extract limbs starting from the least significant.
            limb = iPart % limbSize32; // Could also be iPart >>> 0
            iPart = (iPart - limb) / limbSize32;
            // Append limb to value.
            limbList[len++] = limb;
        }
        this.limbList = limbList;
        this.fractionLen = fractionLen;
        this.len = len;
        return (this);
    };
    BigFloat32.prototype.parseFraction = function (value, base, start, offset, limbBase, limbDigits) {
        var limbList = this.limbList;
        var pos = value.length;
        // Set limbs to zero, because divInt uses them as input.
        var limbNum = offset - 1;
        while (limbNum) {
            limbList[--limbNum] = 0;
        }
        // Read initial digits so their count becomes divisible by limbDigits.
        var posNext = pos - ((pos - start + limbDigits - 1) % limbDigits + 1);
        limbList[offset - 1] = parseInt(value.substr(posNext, pos - posNext), base);
        this.divInt(Math.pow(base, pos - posNext), offset);
        pos = posNext;
        // Read rest of the digits in limbDigits sized chunks.
        while (pos > start) {
            pos -= limbDigits;
            limbList[offset - 1] = parseInt(value.substr(pos, limbDigits), base);
            // Divide by maximum power of base that fits in a limb.
            this.divInt(limbBase, offset);
        }
    };
    BigFloat32.prototype.setString = function (value, base) {
        var _a = BaseInfo32.init(base), limbBase = _a.limbBase, limbDigits = _a.limbDigits, limbDigitsExact = _a.limbDigitsExact;
        var limbList = this.limbList;
        var pos = -1;
        var c;
        this.sign = 1;
        // Handle leading signs and zeroes.
        while (1) {
            c = value.charAt(++pos);
            switch (c) {
                case '-':
                    this.sign = -1;
                case '+':
                case '0':
                    continue;
            }
            break;
        }
        var posDot = (value.indexOf('.', pos) + 1 || value.length + 1) - 1;
        // Handle fractional part.
        if (posDot < value.length - 1) {
            // Reserve enough limbs to contain digits in fractional part.
            var len = ~~((value.length - posDot - 1) / limbDigitsExact) + 1;
            this.parseFraction(value, base, posDot + 1, len + 1, limbBase, limbDigits);
            this.fractionLen = len;
            this.len = len;
            // Remove trailing zeroes.
            this.trimLeast();
        }
        else {
            this.fractionLen = 0;
            this.len = 0;
        }
        var offset = this.fractionLen;
        // Handle integer part.
        if (posDot > pos) {
            // Read initial digits so their count becomes divisible by limbDigits.
            var posNext = pos + (posDot - pos + limbDigits - 1) % limbDigits + 1;
            ++this.len;
            limbList[offset] = parseInt(value.substr(pos, posNext - pos), base);
            pos = posNext;
            // Read rest of the digits in limbDigits sized chunks.
            while (pos < posDot) {
                // Multiply by maximum power of base that fits in a limb.
                if (this.mulInt(limbBase, limbList, offset, offset, 0))
                    ++this.len;
                // Add latest limb.
                limbList[offset] += parseInt(value.substr(pos, limbDigits), base);
                pos += limbDigits;
            }
        }
        return (this);
    };
    /** Trim zero limbs from most significant end. */
    BigFloat32.prototype.trimMost = function () {
        var limbList = this.limbList;
        var fractionLen = this.fractionLen;
        var len = this.len;
        while (len > fractionLen && !limbList[len - 1])
            --len;
        this.len = len;
    };
    /** Trim zero limbs from least significant end. */
    BigFloat32.prototype.trimLeast = function () {
        var limbList = this.limbList;
        var len = this.fractionLen;
        var pos = 0;
        while (pos < len && !limbList[pos])
            ++pos;
        if (pos)
            this.truncate(len - pos);
    };
    /** Multiply by an integer and write output limbs to another list. */
    BigFloat32.prototype.mulInt = function (factor, dstLimbList, srcPos, dstPos, overwriteMask) {
        if (!factor)
            return (0);
        var limbList = this.limbList;
        var limbCount = this.len;
        var limb;
        var lo;
        var carry = 0;
        // limbList is an array of 32-bit ints but split here into 16-bit low
        // and high words for multiplying by a 32-bit term, so the intermediate
        // 48-bit multiplication results fit into 53 bits of IEEE 754 mantissa.
        while (srcPos < limbCount) {
            limb = limbList[srcPos++];
            // Multiply lower half of limb with factor, making carry temporarily take 48 bits.
            carry += factor * (limb & 0xffff);
            // Get lowest 16 bits of full product.
            lo = carry & 0xffff;
            // Right shift by dividing because >> and >>> truncate to 32 bits before shifting.
            carry = (carry - lo) / 65536;
            // Multiply higher half of limb and combine with lowest 16 bits of full product.
            carry += factor * (limb >>> 16);
            lo |= carry << 16;
            // Lowest 32 bits of full product are added to output limb.
            limb = ((dstLimbList[dstPos] & overwriteMask) + lo) >>> 0;
            dstLimbList[dstPos++] = limb;
            // Highest 32 bits of full product stay in carry, also increment by 1 if previous sum overflowed.
            carry = (carry / 65536) >>> 0;
            // Bit twiddle equivalent to: if(limb < (lo >>> 0)) ++carry;
            carry += (lo ^ (((limb - lo) ^ lo) & ~(limb ^ lo))) >>> 31;
        }
        // Extend result by one more limb if it overflows.
        if (carry)
            dstLimbList[dstPos] = carry;
        return (carry);
    };
    BigFloat32.prototype.mulBig = function (multiplier, product) {
        if (this.isZero() || multiplier.isZero())
            return (product.setZero());
        var multiplierLimbs = multiplier.limbList;
        var lenMultiplier = multiplier.len;
        var productLimbs = product.limbList;
        var posProduct = this.len + lenMultiplier;
        product.len = posProduct;
        // TODO: Only clear from len to len + lenMultiplier
        while (posProduct--) {
            productLimbs[posProduct] = 0;
        }
        this.mulInt(multiplierLimbs[0], productLimbs, 0, 0, 0);
        for (var posMultiplier = 1; posMultiplier < lenMultiplier; ++posMultiplier) {
            this.mulInt(multiplierLimbs[posMultiplier], productLimbs, 0, posMultiplier, 0xffffffff);
        }
        product.sign = this.sign * multiplier.sign;
        product.fractionLen = this.fractionLen + multiplier.fractionLen;
        product.trimMost();
        product.trimLeast();
        return (product);
    };
    /** Multiply and return product in a new BigFloat32. */
    BigFloat32.prototype.mul = function (multiplier, product) {
        product = product || new BigFloat32();
        if (typeof (multiplier) == 'number') {
            multiplier = temp32.setNumber(multiplier);
        }
        if (product == this)
            throw (new Error('Multiplication in place is unsupported'));
        return (this.mulBig(multiplier, product));
    };
    BigFloat32.prototype.absDeltaFrom = function (other) {
        if (typeof (other) == 'number') {
            other = temp32.setNumber(other);
        }
        var limbList = this.limbList;
        var otherList = other.limbList;
        var limbCount = this.len;
        var otherCount = other.len;
        // Compare lengths.
        // Note: leading zeroes in integer part must be trimmed for this to work!
        var d = (limbCount - this.fractionLen) - (otherCount - other.fractionLen);
        // If lengths are equal, compare each limb from most to least significant.
        while (!d && limbCount && otherCount)
            d = limbList[--limbCount] - otherList[--otherCount];
        if (d)
            return (d);
        if (limbCount) {
            do
                d = limbList[--limbCount];
            while (!d && limbCount);
        }
        else if (otherCount) {
            do
                d = -otherList[--otherCount];
            while (!d && otherCount);
        }
        return (d);
    };
    BigFloat32.prototype.isZero = function () {
        return (this.len == 0);
    };
    BigFloat32.prototype.getSign = function () {
        return (this.len && this.sign);
    };
    /** Return an arbitrary number with sign matching the result of this - other. */
    BigFloat32.prototype.deltaFrom = function (other) {
        if (typeof (other) == 'number') {
            other = temp32.setNumber(other);
        }
        return (
        // Make positive and negative zero equal.
        this.len + other.len && (
        // Compare signs.
        this.sign - other.sign ||
            // Finally compare full values.
            this.absDeltaFrom(other) * this.sign));
    };
    BigFloat32.prototype.addBig = function (addend, sum) {
        var augend = this;
        var fractionLen = augend.fractionLen;
        var len = fractionLen - addend.fractionLen;
        if (len < 0) {
            len = -len;
            fractionLen += len;
            augend = addend;
            addend = this;
        }
        sum.sign = this.sign;
        sum.fractionLen = fractionLen;
        var sumLimbs = sum.limbList;
        var augendLimbs = augend.limbList;
        var addendLimbs = addend.limbList;
        var posAugend = 0;
        var posAddend = 0;
        var carry = 0;
        var limbSum;
        // If one input has more fractional limbs, just copy the leftovers to output.
        while (posAugend < len) {
            sumLimbs[posAugend] = augendLimbs[posAugend];
            ++posAugend;
        }
        var lenAddend = addend.len;
        len = augend.len - posAugend;
        if (len > lenAddend)
            len = lenAddend;
        // Calculate sum where input numbers overlap.
        while (posAddend < len) {
            carry += augendLimbs[posAugend] + addendLimbs[posAddend++];
            limbSum = carry >>> 0;
            carry = carry - limbSum && 1;
            sumLimbs[posAugend++] = limbSum;
        }
        var posSum = posAugend;
        if (len < lenAddend) {
            len = lenAddend;
            augend = addend;
            posAugend = posAddend;
            augendLimbs = addendLimbs;
        }
        else
            len = augend.len;
        // Copy leftover most significant limbs to output, propagating carry.
        while (posAugend < len) {
            carry += augendLimbs[posAugend++];
            limbSum = carry >>> 0;
            carry = carry - limbSum && 1;
            sumLimbs[posSum++] = limbSum;
        }
        if (carry)
            sumLimbs[posSum++] = carry;
        sum.len = posSum;
        sum.trimLeast();
        return (sum);
    };
    BigFloat32.prototype.subBig = function (subtrahend, difference) {
        var minuend = this;
        difference.sign = this.sign;
        // Make sure the subtrahend is the smaller number.
        if (minuend.absDeltaFrom(subtrahend) < 0) {
            minuend = subtrahend;
            subtrahend = this;
            difference.sign = -this.sign;
        }
        var fractionLen = minuend.fractionLen;
        var len = fractionLen - subtrahend.fractionLen;
        var differenceLimbs = difference.limbList;
        var minuendLimbs = minuend.limbList;
        var subtrahendLimbs = subtrahend.limbList;
        var lenMinuend = minuend.len;
        var lenSubtrahend = subtrahend.len;
        var lenFinal = lenMinuend;
        var posMinuend = 0;
        var posSubtrahend = 0;
        var posDifference = 0;
        var carry = 0;
        var limbDiff;
        if (len >= 0) {
            while (posMinuend < len) {
                differenceLimbs[posMinuend] = minuendLimbs[posMinuend];
                ++posMinuend;
            }
            len += lenSubtrahend;
            if (len > lenMinuend)
                len = lenMinuend;
            posDifference = posMinuend;
        }
        else {
            len = -len;
            fractionLen += len;
            lenFinal += len;
            while (posSubtrahend < len) {
                carry -= subtrahendLimbs[posSubtrahend];
                limbDiff = carry >>> 0;
                carry = -(carry < 0);
                differenceLimbs[posSubtrahend++] = limbDiff;
            }
            len += lenMinuend;
            if (len > lenSubtrahend)
                len = lenSubtrahend;
            posDifference = posSubtrahend;
        }
        difference.fractionLen = fractionLen;
        // Calculate difference where input numbers overlap.
        while (posDifference < len) {
            carry += minuendLimbs[posMinuend++] - subtrahendLimbs[posSubtrahend++];
            limbDiff = carry >>> 0;
            carry = -(carry < 0);
            differenceLimbs[posDifference++] = limbDiff;
        }
        // Copy leftover most significant limbs to output, propagating carry.
        while (posDifference < lenFinal) {
            carry += minuendLimbs[posMinuend++];
            limbDiff = carry >>> 0;
            carry = -(carry < 0);
            differenceLimbs[posDifference++] = limbDiff;
        }
        difference.len = posDifference;
        difference.trimMost();
        difference.trimLeast();
        return (difference);
    };
    BigFloat32.prototype.addSub = function (addend, sign, result) {
        result = result || new BigFloat32();
        if (result == this)
            throw (new Error('Addition and subtraction in place is unsupported'));
        if (typeof (addend) == 'number') {
            addend = temp32.setNumber(addend);
        }
        if (this.sign * addend.sign * sign < 0) {
            return (this.subBig(addend, result));
        }
        else {
            return (this.addBig(addend, result));
        }
    };
    /** Add and return sum in a new BigFloat32. */
    BigFloat32.prototype.add = function (addend, sum) {
        return (this.addSub(addend, 1, sum));
    };
    /** Subtract and return difference in a new BigFloat32. */
    BigFloat32.prototype.sub = function (subtrahend, difference) {
        return (this.addSub(subtrahend, -1, difference));
    };
    /** Round towards zero, to given number of base 2^32 fractional digits. */
    BigFloat32.prototype.truncate = function (fractionLimbCount) {
        var diff = this.fractionLen - fractionLimbCount;
        if (diff > 0) {
            this.fractionLen = fractionLimbCount;
            this.len -= diff;
            var len = this.len;
            var limbList = this.limbList;
            for (var pos = 0; pos < len; ++pos) {
                limbList[pos] = limbList[pos + diff];
            }
        }
        return (this);
    };
    BigFloat32.prototype.round = function (decimalCount) {
        return (this.truncate(1 + ~~(decimalCount * limbsPerDigit32)));
    };
    /** Divide by integer, replacing current value by quotient. Return integer remainder. */
    BigFloat32.prototype.divInt = function (divisor, pos) {
        var limbList = this.limbList;
        var limb;
        var hi, lo;
        var carry = 0;
        // If most significant limb is zero after dividing, decrement number of limbs remaining.
        if (limbList[pos - 1] < divisor) {
            carry = limbList[--pos];
            this.len = pos;
        }
        while (pos--) {
            limb = limbList[pos];
            carry = carry * 0x10000 + (limb >>> 16);
            hi = (carry / divisor) >>> 0;
            carry = carry - hi * divisor;
            carry = carry * 0x10000 + (limb & 0xffff);
            lo = (carry / divisor) >>> 0;
            carry = carry - lo * divisor;
            limbList[pos] = ((hi << 16) | lo) >>> 0;
        }
        return (carry);
    };
    BigFloat32.prototype.fractionToString = function (base, digitList) {
        var _a = BaseInfo32.init(base), pad = _a.pad, limbBase = _a.limbBase;
        var limbList = this.limbList;
        var limbCount = this.fractionLen;
        var limbNum = 0;
        var limbStr;
        if (base & 1) {
            throw (new Error('Conversion of floating point values to odd bases is unsupported'));
        }
        // Skip least significant limbs that equal zero.
        while (limbNum < limbCount && !limbList[limbNum])
            ++limbNum;
        if (limbNum >= limbCount)
            return;
        digitList.push('.');
        var fPart = temp32;
        fPart.limbList = limbList.slice(limbNum, limbCount);
        fPart.len = limbCount - limbNum;
        limbNum = 0;
        while (limbNum < fPart.len) {
            if (fPart.limbList[limbNum]) {
                var carry = fPart.mulInt(limbBase, fPart.limbList, limbNum, limbNum, 0);
                limbStr = carry.toString(base);
                digitList.push(pad.substr(limbStr.length) + limbStr);
            }
            else
                ++limbNum;
        }
    };
    BigFloat32.prototype.getExpansion = function (output) {
        var limbList = this.limbList;
        var len = this.len;
        var exp = this.sign;
        var pos = this.fractionLen;
        while (pos--) {
            exp *= limbInv32;
        }
        while (++pos < len) {
            output[pos] = limbList[pos] * exp;
            exp *= limbSize32;
        }
        return (len);
    };
    BigFloat32.prototype.valueOf = function () {
        var limbList = this.limbList;
        var result = 0;
        var exp = limbInv32 * this.sign;
        var len = this.fractionLen;
        var pos = 0;
        while (pos < len) {
            result = result * limbInv32 + limbList[pos++];
        }
        len = this.len;
        while (pos < len) {
            result = result * limbInv32 + limbList[pos++];
            exp *= limbSize32;
        }
        return (result * exp);
    };
    /** Convert to string in any even base supported by Number.toString.
      * @return String in lower case. */
    BigFloat32.prototype.toString = function (base) {
        if (base === void 0) { base = 10; }
        var _a = BaseInfo32.init(base), pad = _a.pad, limbBase = _a.limbBase;
        var digitList = [];
        var limbList = this.limbList;
        var limbStr;
        if (limbBase != limbSize32) {
            var iPart = temp32;
            iPart.limbList = limbList.slice(this.fractionLen, this.len);
            iPart.len = this.len - this.fractionLen;
            // Loop while 2 or more limbs remain, requiring arbitrary precision division to extract digits.
            while (iPart.len > 1) {
                limbStr = iPart.divInt(limbBase, iPart.len).toString(base);
                // Prepend digits into final result, padded with zeroes to 9 digits.
                // Since more limbs still remain, whole result will not have extra padding.
                digitList.push(pad.substr(limbStr.length) + limbStr);
            }
            // Prepend last remaining limb and sign to result.
            digitList.push('' + (iPart.limbList[0] || 0));
            if (this.sign < 0)
                digitList.push('-');
            digitList.reverse();
            // Handle fractional part.
            this.fractionToString(base, digitList);
        }
        else {
            var limbNum = this.len;
            var fractionPos = this.fractionLen;
            if (this.sign < 0)
                digitList.push('-');
            if (limbNum == fractionPos)
                digitList.push('0');
            while (limbNum--) {
                limbStr = limbList[limbNum].toString(base);
                if (limbNum == fractionPos - 1)
                    digitList.push('.');
                digitList.push(pad.substr(limbStr.length) + limbStr);
            }
        }
        // Remove leading and trailing zeroes.
        return (trimNumber(digitList.join('')));
    };
    return BigFloat32;
}());
BigFloat32.prototype.cmp = BigFloat32.prototype.deltaFrom;
var temp32 = new BigFloat32();

// This file is part of bigfloat, copyright (c) 2018- BusFaster Ltd.
var dekkerSplitter = (1 << 27) + 1;
var limbsPerDigit53 = Math.log(10) / (53 * Math.log(2));
/** See Shewchuk page 7. */
/*
function fastTwoSum(a: number, b: number, sum: number[]) {
    const estimate = a + b;

    sum[0] = b - (estimate - a);
    sum[1] = estimate;

    return(sum);
}
*/
/** Error-free addition of two floating point numbers.
  * See Shewchuk page 8. Note that output order is swapped! */
function twoSum(a, b, sum) {
    var estimate = a + b;
    var b2 = estimate - a;
    var a2 = estimate - b2;
    sum[0] = (a - a2) + (b - b2);
    sum[1] = estimate;
    return (sum);
}
/** Error-free product of two floating point numbers.
  * Store approximate result in global variable tempProduct.
  * See Shewchuk page 20.
  *
  * @return Rounding error. */
function twoProduct(a, b) {
    tempProduct = a * b;
    var a2 = a * dekkerSplitter;
    var aHi = a2 - (a2 - a);
    var aLo = a - aHi;
    var b2 = b * dekkerSplitter;
    var bHi = b2 - (b2 - b);
    var bLo = b - bHi;
    return (aLo * bLo - (tempProduct - aHi * bHi - aLo * bHi - aHi * bLo));
}
/** Arbitrary precision floating point number. Based on a multiple-component
  * expansion format and error free transformations.
  *
  * Maximum exponent is the same as for plain JavaScript numbers,
  * least significant representable binary digit is 2^-1074. */
var BigFloat53 = /** @class */ (function () {
    /** @param value Initial value, a plain JavaScript floating point number
      * (IEEE 754 double precision). */
    function BigFloat53(value, base) {
        /** List of components ordered by increasing exponent. */
        this.limbList = [];
        if (value)
            this.setValue(value, base);
    }
    BigFloat53.prototype.clone = function () {
        return (new BigFloat53().setBig(this));
    };
    /** Set value to zero.
      *
      * @return This object, for chaining. */
    BigFloat53.prototype.setZero = function () {
        this.len = 0;
        return (this);
    };
    BigFloat53.prototype.setValue = function (other, base) {
        if (typeof (other) == 'number') {
            return (this.setNumber(other));
        }
        if (other instanceof BigFloat53) {
            return (this.setBig(other));
        }
        return (this.setString(other.toString(), base || 10));
    };
    BigFloat53.prototype.setBig = function (other) {
        var len = other.len;
        this.len = len;
        for (var pos = 0; pos < len; ++pos) {
            this.limbList[pos] = other.limbList[pos];
        }
        return (this);
    };
    /** Set value to a plain JavaScript floating point number
      * (IEEE 754 double precision).
      *
      * @param value New value.
      * @return This object, for chaining. */
    BigFloat53.prototype.setNumber = function (value) {
        this.limbList[0] = value;
        this.len = value && 1;
        return (this);
    };
    BigFloat53.prototype.setString = function (value, base) {
        temp32$1[0].setValue(value, base);
        this.len = temp32$1[0].getExpansion(this.limbList);
        this.normalize();
        return (this);
    };
    /** Set value to the sum of two JavaScript numbers.
      *
      * @param a Augend.
      * @param b Addend.
      * @return This object, for chaining. */
    BigFloat53.prototype.setSum = function (a, b) {
        this.len = 2;
        twoSum(a, b, this.limbList);
        return (this);
    };
    /** Set value to the product of two JavaScript numbers.
      * @param a Multiplicand.
      * @param b Multiplier.
      * @return This object, for chaining. */
    BigFloat53.prototype.setProduct = function (a, b) {
        this.len = 2;
        this.limbList[0] = twoProduct(a, b);
        this.limbList[1] = tempProduct;
        return (this);
    };
    /** See Compress from Shewchuk page 25. */
    // TODO: Test.
    BigFloat53.prototype.normalize = function () {
        var limbList = this.limbList;
        var len = this.len;
        var limb;
        if (len) {
            var a = len - 1;
            var b = len - 1;
            var q = limbList[a];
            var err = void 0;
            while (a) {
                limb = limbList[--a];
                err = q;
                q += limb;
                err = limb - (q - err);
                limbList[b] = q;
                b -= err && 1;
                q = err || q;
            }
            limbList[b] = q;
            while (++b < len) {
                limb = limbList[b];
                err = q;
                q += limb;
                err -= q - limb;
                limbList[a] = err;
                a += err && 1;
            }
            limbList[a] = q;
            this.len = a + (q && 1);
        }
        return (this);
    };
    /** Multiply this arbitrary precision float by a number.
      * See Scale-Expansion from Shewchuk page 21.
      *
      * @param b Multiplier, a JavaScript floating point number.
      * @param product Arbitrary precision float to overwrite with result.
      * @return Modified product object. */
    BigFloat53.prototype.mulSmall = function (b, product) {
        var limbList = this.limbList;
        var productLimbs = product.limbList;
        var count = this.len;
        var t1, t2, t3;
        var srcPos = 0, dstPos = 0;
        /** Write output limb and move to next, unless a zero was written. */
        function writeLimb(limb) {
            productLimbs[dstPos] = limb;
            dstPos += limb && 1;
        }
        writeLimb(twoProduct(limbList[srcPos++], b));
        var q = tempProduct;
        while (srcPos < count) {
            t1 = twoProduct(limbList[srcPos++], b);
            t2 = q + t1;
            t3 = t2 - q;
            writeLimb(q - (t2 - t3) + (t1 - t3));
            q = tempProduct + t2;
            writeLimb(t2 - (q - tempProduct));
        }
        productLimbs[dstPos] = q;
        product.len = dstPos + (q && 1);
        return (product);
    };
    /** Multiply this by an arbitrary precision multiplier.
      * Pass all components of the multiplier to mulSmall and sum the products.
      *
      * @param multiplier Number or arbitrary precision float.
      * @param product Arbitrary precision float to overwrite with result.
      * @return Modified product object. */
    BigFloat53.prototype.mulBig = function (multiplier, product) {
        var limbList = multiplier.limbList;
        var pos = multiplier.len;
        if (!pos)
            return (product.setZero());
        --pos;
        this.mulSmall(limbList[pos], pos ? temp53[pos & 1] : product);
        while (pos) {
            --pos;
            this.mulSmall(limbList[pos], product).addBig(temp53[~pos & 1], 1, pos ? temp53[pos & 1] : product);
        }
        return (product);
    };
    /** Multiply number or arbitrary precision float with this one
      * and store result in another BigFloat53.
      *
      * @param multiplier Number or arbitrary precision float.
      * @param product Arbitrary precision float to overwrite with result.
      * If omitted, a new one is allocated.
      * @return Modified product object. */
    BigFloat53.prototype.mul = function (multiplier, product) {
        product = product || new BigFloat53();
        if (typeof (multiplier) == 'number') {
            return (this.mulSmall(multiplier, product));
        }
        if (product == this)
            throw (new Error('Cannot multiply in place'));
        return (this.mulBig(multiplier, product));
    };
    BigFloat53.prototype.isZero = function () {
        var limbList = this.limbList;
        var pos = this.len;
        while (pos--) {
            if (limbList[pos])
                return (false);
        }
        return (true);
    };
    BigFloat53.prototype.getSign = function () {
        var t = this.len;
        return (t && (t = this.limbList[t - 1]) && (t > 0 ? 1 : -1));
    };
    /** Return an arbitrary number with sign matching the result of this - other. */
    // TODO: Test.
    BigFloat53.prototype.deltaFrom = function (other) {
        var t = this.len;
        var sign = this.getSign();
        var diff = sign;
        if (typeof (other) != 'number') {
            t = other.len;
            diff -= t && (t = other.limbList[t - 1]) && (t > 0 ? 1 : -1);
            if (diff || !sign)
                return (diff);
            this.addBig(other, -1, temp53[0]);
        }
        else {
            diff -= other && (other > 0 ? 1 : -1);
            if (diff || !sign)
                return (diff);
            this.addSmall(-other, temp53[0]);
        }
        t = temp53[0].len;
        return (t && temp53[0].limbList[t - 1]);
    };
    /** Add a number to this arbitrary precision float.
      * See Grow-Expansion from Shewchuk page 10.
      *
      * @param b JavaScript floating point number to add.
      * @param sum Arbitrary precision float to overwrite with result.
      * @return Modified sum object. */
    BigFloat53.prototype.addSmall = function (b, sum) {
        var limbList = this.limbList;
        var sumLimbs = sum.limbList;
        var count = this.len;
        var estimate;
        var a, b2, err;
        var srcPos = 0, dstPos = 0;
        while (srcPos < count) {
            a = limbList[srcPos++];
            estimate = a + b;
            b2 = estimate - a;
            a -= estimate - b2;
            err = a + (b - b2);
            sumLimbs[dstPos] = err;
            dstPos += err && 1;
            b = estimate;
        }
        sumLimbs[dstPos] = b;
        sum.len = dstPos + (b && 1);
        return (sum);
    };
    /** Add another arbitrary precision float (multiplied by sign) to this one.
      * See Fast-Expansion-Sum from Shewchuk page 13.
      *
      * @param sign Multiplier for negating addend to implement subtraction.
      * @param sum Arbitrary precision float to overwrite with result.
      * @return Modified sum object. */
    BigFloat53.prototype.addBig = function (addend, sign, sum) {
        var augendLimbs = this.limbList;
        var addendLimbs = addend.limbList;
        var sumLimbs = sum.limbList;
        var count = this.len + addend.len;
        var nextAugendPos = 0;
        var nextAddendPos = 0;
        var nextSumPos = 0;
        /** Latest limb of augend. */
        var a = augendLimbs[nextAugendPos++];
        /** Latest limb of addend. */
        var b = addendLimbs[nextAddendPos++] * sign;
        /** Magnitude of latest augend limb. */
        var a2 = a < 0 ? -a : a;
        /** Magnitude of latest addend limb. */
        var b2 = b < 0 ? -b : b;
        var nextLimb, nextLimb2, prevLimb;
        var err;
        if (!count)
            return (sum.setZero());
        // Append sentinel limbs to avoid testing for end of array.
        augendLimbs[this.len] = Infinity;
        addendLimbs[addend.len] = Infinity;
        /** Get next smallest limb from either augend or addend.
          * This avoids merging the two limb lists. */
        function getNextLimb() {
            var result;
            if (a2 < b2) {
                result = a;
                a = augendLimbs[nextAugendPos++];
                a2 = a < 0 ? -a : a;
            }
            else {
                result = b;
                b = addendLimbs[nextAddendPos++] * sign;
                b2 = b < 0 ? -b : b;
            }
            return (result);
        }
        var limb = getNextLimb();
        while (--count) {
            nextLimb = getNextLimb();
            prevLimb = limb;
            limb += nextLimb;
            nextLimb2 = limb - prevLimb;
            err = (prevLimb - (limb - nextLimb2)) + (nextLimb - nextLimb2);
            sumLimbs[nextSumPos] = err;
            nextSumPos += err && 1;
        }
        sumLimbs[nextSumPos] = limb;
        sum.len = nextSumPos + (limb && 1);
        return (sum);
    };
    BigFloat53.prototype.addSub = function (addend, sign, result) {
        result = result || new BigFloat53();
        if (typeof (addend) == 'number')
            return (this.addSmall(sign * addend, result));
        return (this.addBig(addend, sign, result));
    };
    /** Add number or arbitrary precision float to this one
      * and store result in another BigFloat53.
      *
      * @param addend Number or arbitrary precision float.
      * @param sum Arbitrary precision float to overwrite with result.
      * If omitted, a new one is allocated.
      * @return Modified sum object. */
    BigFloat53.prototype.add = function (addend, sum) {
        return (this.addSub(addend, 1, sum));
    };
    /** Subtract number or arbitrary precision float from this one
      * and store result in another BigFloat53.
      *
      * @param subtrahend Number or arbitrary precision float.
      * @param difference Arbitrary precision float to overwrite with result.
      * If omitted, a new one is allocated.
      * @return Modified difference object. */
    BigFloat53.prototype.sub = function (subtrahend, difference) {
        return (this.addSub(subtrahend, -1, difference));
    };
    /** Round towards zero, to (at least) given number of base 2^53 fractional digits. */
    BigFloat53.prototype.truncate = function (fractionLimbCount) {
        this.normalize();
        var limbList = this.limbList;
        var len = this.len;
        // Use binary search to find last |limb| < 1.
        var lo = 0;
        var hi = len;
        var mid = 0;
        var limb = 0;
        while (lo < hi) {
            mid = (lo + hi) >> 1;
            limb = limbList[mid];
            if (limb > -1 && limb < 1) {
                lo = mid + 1;
            }
            else {
                hi = mid;
            }
        }
        if (mid && (limb <= -1 || limb >= 1)) {
            limb = limbList[--mid];
        }
        // Slice off limbs before and including it,
        // except the fractionLimbCount last ones.
        mid -= fractionLimbCount - 1;
        if (mid > 0) {
            this.len -= mid;
            len = this.len;
            for (var pos = 0; pos < len; ++pos) {
                limbList[pos] = limbList[pos + mid];
            }
        }
        return (this);
    };
    BigFloat53.prototype.round = function (decimalCount) {
        return (this.truncate(1 + ~~(decimalCount * limbsPerDigit53)));
    };
    BigFloat53.prototype.valueOf = function () {
        var limbList = this.limbList;
        var len = this.len;
        var result = 0;
        for (var pos = 0; pos < len; ++pos) {
            result += limbList[pos];
        }
        return (result);
    };
    /** Convert to string in any even base supported by Number.toString.
      * @return String in lower case. */
    BigFloat53.prototype.toString = function (base) {
        var limbList = this.limbList;
        var pos = this.len;
        temp32$1[pos & 1].setZero();
        while (pos--) {
            temp32$1[~pos & 1].add(limbList[pos], temp32$1[pos & 1]);
        }
        return (temp32$1[~pos & 1].toString(base));
    };
    return BigFloat53;
}());
BigFloat53.prototype.cmp = BigFloat53.prototype.deltaFrom;
/** Latest approximate product from twoProduct. */
var tempProduct = 0;
/** Temporary values for internal calculations. */
var temp32$1 = [new BigFloat32(), new BigFloat32()];
/** Temporary values for internal calculations. */
var temp53 = [new BigFloat53(), new BigFloat53()];

// This file is part of bigfloat, copyright (c) 2018- BusFaster Ltd.
/** Simpler replacement for the default TypeScript helper.
  * Ignores static members and avoids rollup warnings. */
function __extends(child, parent) {
    function helper() { this.constructor = child; }
    helper.prototype = parent.prototype;
    child.prototype = new helper();
}
var BigComplex = /** @class */ (function () {
    function BigComplex(real, imag, base) {
        this.real = typeof (real) == 'object' ? real : new this.Base(real, base);
        this.imag = typeof (imag) == 'object' ? imag : new this.Base(imag, base);
    }
    BigComplex.prototype.clone = function () {
        var other = new this.constructor(this.real.clone(), this.imag.clone());
        return (other);
    };
    BigComplex.prototype.setZero = function () {
        this.real.setZero();
        this.imag.setZero();
        return (this);
    };
    BigComplex.prototype.setValue = function (other) {
        this.real.setValue(other.real);
        this.imag.setValue(other.imag);
        return (this);
    };
    BigComplex.prototype.mul = function (multiplier, product) {
        product = product || new this.constructor();
        if (multiplier instanceof BigComplex) {
            this.real.mul(multiplier.real, this.temp1);
            this.imag.mul(multiplier.imag, this.temp2);
            this.temp1.sub(this.temp2, product.real);
            this.real.mul(multiplier.imag, this.temp1);
            this.imag.mul(multiplier.real, this.temp2);
            this.temp1.add(this.temp2, product.imag);
        }
        else {
            this.real.mul(multiplier, product.real);
            this.imag.mul(multiplier, product.imag);
        }
        return (product);
    };
    BigComplex.prototype.sqr = function (product) {
        product = product || new this.constructor();
        this.real.mul(this.real, this.temp1);
        this.imag.mul(this.imag, this.temp2);
        this.temp1.sub(this.temp2, product.real);
        this.real.mul(this.imag, this.temp1);
        this.temp1.add(this.temp1, product.imag);
        return (product);
    };
    BigComplex.prototype.add = function (addend, sum) {
        sum = sum || new this.constructor();
        if (addend instanceof BigComplex) {
            this.real.add(addend.real, sum.real);
            this.imag.add(addend.imag, sum.imag);
        }
        else {
            this.real.add(addend, sum.real);
        }
        return (sum);
    };
    BigComplex.prototype.sub = function (subtrahend, difference) {
        difference = difference || new this.constructor();
        if (subtrahend instanceof BigComplex) {
            this.real.sub(subtrahend.real, difference.real);
            this.imag.sub(subtrahend.imag, difference.imag);
        }
        else {
            this.real.sub(subtrahend, difference.real);
        }
        return (difference);
    };
    BigComplex.prototype.truncate = function (fractionLimbCount) {
        this.real.truncate(fractionLimbCount);
        this.imag.truncate(fractionLimbCount);
        return (this);
    };
    return BigComplex;
}());
var BigComplex32 = /** @class */ (function (_super) {
    __extends(BigComplex32, _super);
    function BigComplex32() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return BigComplex32;
}(BigComplex));
var BigComplex53 = /** @class */ (function (_super) {
    __extends(BigComplex53, _super);
    function BigComplex53() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return BigComplex53;
}(BigComplex));
BigComplex32.prototype.Base = BigFloat32;
BigComplex32.prototype.temp1 = new BigFloat32();
BigComplex32.prototype.temp2 = new BigFloat32();
BigComplex53.prototype.Base = BigFloat53;
BigComplex53.prototype.temp1 = new BigFloat53();
BigComplex53.prototype.temp2 = new BigFloat53();