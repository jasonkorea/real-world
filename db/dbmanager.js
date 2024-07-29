const mongoose = require('mongoose');
const Unit = require('../models/unit');
const User = require('../models/UserModel');
const Decimal128 = mongoose.Types.Decimal128;
const Util = require('../util/util');

exports.createOrUpdateUnit = async (msg) => {
    try {
        if (msg.sender == -1) {
            msg.sender = Util.getWorldId();
        }
        const user = await User.findOne({ googleId: msg.sender });
        if (!user) {
            console.log('사용자를 찾을 수 없습니다.');
            //throw new Error('사용자를 찾을 수 없습니다.');
        }
        console.log('사용자를 찾았습니다.');
        console.log(user);
        const id = msg.sender;
        const startLatString = msg.unitInfo.startPosition.lat.toString();
        const startLngString = msg.unitInfo.startPosition.lng.toString();
        const startPosition = { lat: startLatString, lng: startLngString };
        const destLatString = msg.unitInfo.destinationPosition.lat.toString();
        const destLngString = msg.unitInfo.destinationPosition.lng.toString();
        const destinationPosition = { lat: destLatString, lng: destLngString };
        const size = msg.unitInfo.size;
        const speed = msg.unitInfo.speed;
        const image = msg.unitInfo.image;
        if (msg.unitInfo.startTime) {
            console.log('msg.unitInfo.startTime exists!!!', msg.unitInfo.startTime);
        } else {
            console.log('msg.unitInfo.startTime does not exist!!!', msg.unitInfo.startTime);
        }
        //const startTime = msg.unitInfo.startTime ? msg.unitInfo.startTime : Date.now();
        let startTime;
        if (msg.unitInfo.startTime) {
            if (startPosition == destinationPosition) {
                console.log('출발지와 목적지가 같습니다. startTime을 현재 시간으로 설정합니다.');
                startTime = Date.now();
            } else {
                console.log('출발지와 목적지가 다릅니다. startTime을 msg.unitInfo.startTime으로 설정합니다.');
                startTime = msg.unitInfo.startTime;
            }
        } else {
            console.log('msg.unitInfo.startTime이 없습니다. startTime을 서버 시간으로 설정합니다.');
            startTime = Date.now();
        }

        //let existingUnit = await Unit.findOne({ id: unit.sender });
        let existingUnit = user.unit ? await Unit.findById(user.unit) : null;
        if (existingUnit) {
            existingUnit.id = id;
            existingUnit.size = size;
            existingUnit.speed = speed;
            existingUnit.image = image;
            // 소수점 잃지 말고 Decimal128로 저장
            existingUnit.startPosition = { lat: Decimal128.fromString(startLatString), lng: Decimal128.fromString(startLngString) };
            existingUnit.destinationPosition = { lat: Decimal128.fromString(destLatString), lng: Decimal128.fromString(destLngString) };
            existingUnit.startTime = startTime;

            console.log('startTime:', existingUnit.startTime);
            console.log(`유닛을 찾았습니다. startTime : ${startTime}`);
            // 업데이트된 유닛을 저장합니다.
            console.log('유닛을 저장합니다.');
            await existingUnit.save();
            console.log('유닛이 업데이트되었습니다.');
        } else {
            // 새 유닛을 생성합니다.
            console.log('유닛을 찾지 못했습니다. 새로 생성합니다. sender :', msg.sender);
            console.log('unit:', msg);
            const newUnit = new Unit({
                id: id,
                size: size,
                speed: speed,
                image: image,
                startPosition: { lat: Decimal128.fromString(startLatString), lng: Decimal128.fromString(startLngString) },
                destinationPosition: { lat: Decimal128.fromString(destLatString), lng: Decimal128.fromString(destLngString) },
                startTime: startTime
            });
            // show newUnit
            console.log('newUnit:', newUnit);

            await newUnit.save();

            //print all units
            const units = await Unit.find();
            console.log('units:', units);

            user.unit = newUnit._id;
            await user.save();
            console.log('유닛이 생성되었습니다.');
            existingUnit = newUnit;
        }
        return existingUnit;
    } catch (error) {
        console.error(error);
        throw error; // 호출자가 처리할 수 있도록 오류를 다시 던집니다.
    }
}

exports.getAllUnits = async () => {
    try {
        const units = await Unit.find();
        return units;
    } catch (error) {
        console.error(error);
        throw error;
    }
}

//clear all units
exports.clearAllUnits = async () => {
    try {
        await Unit.deleteMany({});
    } catch (error) {
        console.error(error);
        throw error;
    }
}

exports.getDisplayNameByGoogleId = async (googleId) => {
    try {
        const user = await User.findOne({
            googleId:
                googleId
        });
        return user ? user.displayName : undefined;
    }
    catch (error) {
        console.error(error);
        throw error;
    }
};