import express from "express";

import {
    getStantsuud,
    getStantsuudById
} from "../controllers/stantsuud.controller.js";

const router = express.Router();


// =====================================================
// БҮХ СТАНЦ
// GET /weather__db/stantsuud
// =====================================================

/**
 * @swagger
 * /weather__db/stantsuud:
 *   get:
 *     tags:
 *       - Cities
 *     summary: Бүх цаг уурын станц авах
 *     description: MySQL өгөгдлийн сангаас бүх цаг уурын станцын мэдээллийг авна.
 *     responses:
 *       200:
 *         description: Станцуудын жагсаалт амжилттай ирсэн
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 321
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Station'
 *       500:
 *         description: Серверийн алдаа
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

router.get(
    "/",
    getStantsuud
);


// =====================================================
// НЭГ СТАНЦ
// GET /weather__db/stantsuud/549
// =====================================================

/**
 * @swagger
 * /weather__db/stantsuud/{stants_dugaar}:
 *   get:
 *     tags:
 *       - Cities
 *     summary: Нэг станц авах
 *     description: Станцын дугаараар тухайн станцын мэдээллийг авна.
 *     parameters:
 *       - in: path
 *         name: stants_dugaar
 *         required: true
 *         description: Станцын дугаар
 *         schema:
 *           type: string
 *         example: "549"
 *     responses:
 *       200:
 *         description: Станцын мэдээлэл амжилттай ирсэн
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Station'
 *
 *       400:
 *         description: Станцын дугаар оруулаагүй
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 *       404:
 *         description: Станц олдсонгүй
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 *       500:
 *         description: Серверийн алдаа
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

router.get(
    "/:stants_dugaar",
    getStantsuudById
);


// =====================================================
// DEFAULT EXPORT
// =====================================================

export default router;
